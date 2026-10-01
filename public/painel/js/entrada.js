// Caixa de entrada (ou Minhas demandas), Arquivo e Concluídos.
import { estado, acoes, ativos, usuarioPorId, eAdmin } from './estado.js';
import {
  el, botao, link, icone, avatar, etiquetaServico, ETAPAS, NOME_ETAPA, SERVICOS, ORIGENS, diaDe, hoje, diasEntre,
  relativo, dataHora, normalizar, textoBusca, linkWhatsApp, reais, diaBr,
} from './util.js';

const filtro = { modo: 'todos', servico: '', texto: '', responsavel: '' };

// Três listas na mesma tela: caixa de entrada (para o funcionário, "Minhas demandas"),
// arquivo e concluídos (as demandas do funcionário que já chegaram em Entregue).
const TIPOS = {
  entrada: { data: 'criado_em', icone: 'entrada' },
  arquivo: { data: 'arquivado_em', icone: 'arquivo' },
  concluidos: { data: 'atualizado_em', icone: 'ok' },
};

export function desenharEntrada(raiz, { arquivo = false, concluidos = false } = {}) {
  const admin = eAdmin();
  const tipo = arquivo ? 'arquivo' : concluidos ? 'concluidos' : 'entrada';
  // O que chega em Entregue sai da caixa de entrada (e de "Minhas demandas") e vai para Concluídos.
  const base = tipo === 'arquivo' ? estado.contatos.filter(c => c.arquivado_em)
    : tipo === 'concluidos' ? ativos().filter(c => c.etapa === 'entregue')
      : ativos().filter(c => c.etapa !== 'entregue');
  const filtrar = () => {
    const busca = normalizar(filtro.texto);
    return base.filter(c =>
      (tipo !== 'entrada' || filtro.modo === 'todos' || (filtro.modo === 'aguardando' ? !c.etapa : !c.lido_em)) &&
      (!filtro.servico || c.servico === filtro.servico) &&
      (tipo !== 'concluidos' || !filtro.responsavel || c.responsavel_id === Number(filtro.responsavel)) &&
      (!busca || textoBusca(c).includes(busca)));
  };
  const redesenhar = () => desenharEntrada(raiz, { arquivo, concluidos });

  const titulo = tipo === 'arquivo' ? 'Arquivo' : tipo === 'concluidos' ? 'Concluídos' : admin ? 'Caixa de entrada' : 'Minhas demandas';
  const descricao = {
    arquivo: 'Contatos que não seguiram adiante. Nada se perde: dá para restaurar quando quiser.',
    concluidos: admin
      ? 'Tudo o que chegou em Entregue. Para reabrir uma demanda, abra a ficha e volte a etapa.'
      : 'Demandas que você concluiu. Ficam aqui como registro, só para consulta. Para reabrir alguma, fale com um administrador.',
    entrada: admin
      ? 'Todo contato que chega pelo site entra aqui. Abra para ver a ficha ou use "Mover para…" para levar à etapa certa.'
      : 'As demandas em que você é o responsável. Abra para ver a ficha, anexar a ordem de serviço e avançar as etapas. Ao concluir, a demanda vai para Concluídos.',
  }[tipo];

  const cabecalho = el('header', 'tela-topo',
    el('div', '', el('h1', '', titulo), el('p', '', descricao)),
    admin ? botao('Exportar planilha', 'botao--fantasma', () => exportar(filtrar(), arquivo), { icone: 'baixar', titulo: 'Baixar os contatos desta lista em CSV (abre no Excel)' }) : null);

  const ferramentas = el('div', 'ferramentas');
  if (tipo === 'entrada') {
    ferramentas.append(segmentado([
      ['todos', 'Todos', base.length],
      ['aguardando', 'Aguardando', base.filter(c => !c.etapa).length],
      ['nao-lidos', 'Não lidos', base.filter(c => !c.lido_em).length],
    ], filtro.modo, valor => { filtro.modo = valor; redesenhar(); }));
  }
  const conteudo = el('div', 'lista-area');
  // O filtro de texto só redesenha a lista, para o campo não perder o foco.
  const pintarLista = () => {
    const lista = filtrar();
    if (tipo === 'concluidos') lista.sort((a, b) => String(b.atualizado_em).localeCompare(String(a.atualizado_em)));
    conteudo.replaceChildren(lista.length ? agrupar(lista, tipo) : vazio(tipo, base.length));
  };
  if (tipo === 'concluidos' && admin) {
    ferramentas.append(listaSuspensa('Responsável', [['', 'Toda a equipe'], ...estado.usuarios.map(u => [String(u.id), u.nome])], filtro.responsavel,
      valor => { filtro.responsavel = valor; redesenhar(); }));
  }
  ferramentas.append(
    listaSuspensa('Serviço', [['', 'Todos os serviços'], ['calculos', 'Cálculos'], ['automacao', 'Automação']], filtro.servico,
      valor => { filtro.servico = valor; redesenhar(); }),
    campoFiltro(filtro.texto, texto => { filtro.texto = texto; pintarLista(); }));

  pintarLista();
  raiz.replaceChildren(cabecalho, ferramentas, conteudo);
}

function agrupar(lista, tipo) {
  const dia = hoje();
  const grupos = new Map();
  for (const c of lista) {
    const dias = diasEntre(diaDe(c[TIPOS[tipo].data] || c.criado_em), dia);
    const rotulo = dias === 0 ? 'Hoje' : dias === 1 ? 'Ontem' : dias < 7 ? 'Nesta semana' : dias < 31 ? 'Neste mês' : 'Mais antigos';
    if (!grupos.has(rotulo)) grupos.set(rotulo, []);
    grupos.get(rotulo).push(c);
  }
  return el('div', 'grupos', [...grupos].map(([rotulo, itens]) =>
    el('section', 'grupo', el('h2', 'grupo-titulo', rotulo, el('small', '', String(itens.length))),
      el('ul', 'lista-contatos', itens.map(c => linha(c, tipo))))));
}

// Cada linha tem, à direita, uma grade de colunas fixas. Quando falta um dado, a célula fica
// reservada (vazia ou com "—"), para as colunas não saírem do alinhamento de uma linha para outra.
//   Concluídos (admin):   concluída | responsável | valor | reabrir
//   Concluídos (func.):   concluída
//   Caixa de entrada:     situação | WhatsApp | responsável | ação     (func.: situação | WhatsApp | ação)
//   Arquivo:              situação | WhatsApp | responsável | ação
function linha(c, tipo) {
  const admin = eAdmin();
  const concluida = tipo === 'concluidos';
  const item = el('li', `contato contato--${c.servico}${c.lido_em || concluida ? '' : ' is-novo'}${concluida ? ' is-concluido' : ''}`);
  const responsavel = usuarioPorId(c.responsavel_id);
  const previa = c.descricao || c.atividade_manual || c.observacoes || '';
  const abrir = () => acoes.abrirFicha(c.id);

  const principal = el('button', 'contato-principal',
    el('span', 'contato-marcador', c.lido_em || concluida ? '' : el('span', 'ponto-novo', el('span', 'sr', 'Não lido'))),
    avatar(c.nome),
    el('span', 'contato-texto',
      el('span', 'contato-linha1', el('strong', 'contato-nome', c.nome), etiquetaServico(c.servico),
        c.origem !== 'site' ? el('span', 'origem', ORIGENS[c.origem] || c.origem) : null,
        c.plano ? el('span', 'origem', c.plano) : null),
      el('span', 'contato-previa', previa || (c.email || c.telefone || 'Sem descrição'))));
  principal.type = 'button';
  principal.title = concluida ? `Ver a ficha de ${c.nome} · concluída em ${dataHora(c.atualizado_em)}` : `Abrir a ficha de ${c.nome} · chegou em ${dataHora(c.criado_em)}`;
  principal.addEventListener('click', abrir);

  // Células
  const situacao = el('div', 'celula celula--situacao',
    el('time', '', concluida ? `concluída ${relativo(c.atualizado_em)}` : relativo(tipo === 'arquivo' ? c.arquivado_em : c.criado_em)),
    concluida
      ? el('span', 'etapa-pill etapa-pill--ok', icone('ok'), 'Concluída')
      : el('span', `etapa-pill${c.etapa ? '' : ' etapa-pill--caixa'}${c.etapa === 'entregue' ? ' etapa-pill--ok' : ''}`,
        c.etapa ? NOME_ETAPA[c.etapa] : 'Aguardando'));
  situacao.addEventListener('click', abrir);

  const whatsapp = linkWhatsApp(c);
  const celulaWhatsapp = el('div', 'celula celula--icone',
    whatsapp ? link('', whatsapp, 'botao botao--icone botao--fantasma', { icone: 'whatsapp', novaAba: true, titulo: `Chamar ${c.nome} no WhatsApp` }) : null);

  const celulaResponsavel = el('div', 'celula celula--icone',
    responsavel ? avatar(responsavel.nome, 'avatar--pequeno') : el('span', 'sem-responsavel', icone('usuario'), el('span', 'sr', 'Sem responsável')));

  const temValor = c.valor_centavos !== null && c.valor_centavos !== undefined;
  const celulaValor = el('div', `celula celula--valor${temValor ? '' : ' is-vazio'}`, temValor ? reais(c.valor_centavos) : '—');
  if (!temValor) celulaValor.title = 'Sem valor registrado';

  const celulaAcao = el('div', 'celula celula--acao');
  if (tipo === 'arquivo') {
    celulaAcao.append(botao('Restaurar', 'botao--fantasma botao--pequeno', () => acoes.alterar(c.id, { arquivado: false }, 'Contato restaurado.'), { icone: 'restaurar' }));
  } else if (tipo === 'entrada') {
    celulaAcao.append(moverPara(c, admin));
  }

  let celulas;
  let modelo;
  if (concluida) {
    if (admin) {
      celulaAcao.append(botao('Reabrir', 'botao--fantasma botao--pequeno', () => acoes.mover(c.id, 'revisado'),
        { icone: 'restaurar', titulo: 'Devolve ao Andamento, em Revisado pelo cliente' }));
    }
    celulas = admin ? [situacao, celulaResponsavel, celulaValor, celulaAcao] : [situacao];
    modelo = admin ? 'concluidos' : 'concluidos-func';
  } else if (tipo === 'entrada' && !admin) {
    celulas = [situacao, celulaWhatsapp, celulaAcao];
    modelo = 'entrada-func';
  } else {
    celulas = [situacao, celulaWhatsapp, celulaResponsavel, celulaAcao];
    modelo = tipo === 'arquivo' ? 'arquivo' : 'entrada';
  }

  item.append(principal, el('div', `contato-colunas contato-colunas--${modelo}`, celulas));
  return item;
}

// Lista "Mover para…" com todas as etapas, menos a atual. O funcionário vê só as dele;
// para ele, "Entregue" abre a aba de entrega da ficha (precisa subir os arquivos finais antes de concluir).
function moverPara(c, admin) {
  const destinos = ETAPAS.filter(([chave]) => chave !== c.etapa && (admin || ['processo_iniciado', 'revisado', 'entregue'].includes(chave)));
  const lista = el('select', 'mover-para');
  lista.setAttribute('aria-label', `Mover ${c.nome} para outra etapa`);
  const titulo = el('option', '', 'Mover para…');
  titulo.value = '';
  titulo.disabled = true;
  titulo.selected = true;
  lista.append(titulo);
  const acoesFuncionario = { processo_iniciado: 'Iniciar processo', revisado: 'Aguardar revisão do cliente', entregue: 'Entregar (enviar arquivos finais)' };
  for (const [chave, nome] of destinos) {
    // Para trás, o rótulo diz "Voltar"; para frente, o funcionário vê o nome da ação.
    const voltando = ETAPAS.findIndex(([k]) => k === chave) < ETAPAS.findIndex(([k]) => k === c.etapa);
    const opcao = el('option', '', voltando ? `Voltar para ${nome}` : admin ? nome : acoesFuncionario[chave]);
    opcao.value = chave;
    lista.append(opcao);
  }
  lista.addEventListener('change', () => {
    const destino = lista.value;
    lista.value = '';
    if (!admin && destino === 'entregue') acoes.abrirFicha(c.id, 'entregue');
    else acoes.mover(c.id, destino);
  });
  return lista;
}

function vazio(tipo, totalBase) {
  if (totalBase) return el('div', 'vazio', icone('busca', 'icone vazio-icone'), el('p', '', 'Nenhum contato com esses filtros.'));
  const textos = {
    arquivo: 'O arquivo está vazio.',
    concluidos: 'Nenhuma demanda concluída ainda. Quando uma demanda chega em Entregue, ela aparece aqui.',
    entrada: eAdmin()
      ? 'Nenhum contato ainda. Os pedidos do site aparecem aqui assim que alguém enviar o formulário.'
      : 'Nenhuma demanda em aberto com você. As novas aparecem aqui quando um administrador te colocar como responsável.',
  };
  return el('div', 'vazio', icone(TIPOS[tipo].icone, 'icone vazio-icone'), el('p', '', textos[tipo]));
}

export function segmentado(opcoes, atual, aoEscolher) {
  const grupo = el('div', 'segmentado');
  grupo.setAttribute('role', 'group');
  for (const [valor, rotulo, contagem] of opcoes) {
    const b = el('button', 'segmento', rotulo, contagem !== undefined ? el('b', '', String(contagem)) : null);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(valor === atual));
    b.addEventListener('click', () => aoEscolher(valor));
    grupo.append(b);
  }
  return grupo;
}

// Filtro em lista suspensa: mais limpo que uma fileira de botões quando há muitas opções.
export function listaSuspensa(rotulo, opcoes, atual, aoEscolher) {
  const select = el('select');
  select.setAttribute('aria-label', rotulo);
  for (const [valor, texto] of opcoes) {
    const opcao = el('option', '', texto);
    opcao.value = valor;
    opcao.selected = valor === atual;
    select.append(opcao);
  }
  select.addEventListener('change', () => aoEscolher(select.value));
  return el('label', `lista-suspensa${atual ? ' is-ativa' : ''}`, el('span', 'lista-suspensa-rotulo', rotulo), select);
}

export function campoFiltro(valor, aoMudar) {
  const caixa = el('label', 'campo-filtro', icone('busca'));
  const campo = el('input');
  campo.type = 'search';
  campo.placeholder = 'Filtrar por nome, e-mail, telefone…';
  campo.value = valor;
  campo.dataset.filtro = '';
  campo.setAttribute('aria-label', 'Filtrar contatos');
  campo.addEventListener('input', () => aoMudar(campo.value));
  caixa.append(campo);
  return caixa;
}

// ---------- Exportar ----------

function exportar(lista, arquivo) {
  const colunas = [
    ['Chegou em', c => dataHora(c.criado_em)],
    ['Serviço', c => SERVICOS[c.servico]?.nome],
    ['Nome', c => c.nome],
    ['WhatsApp', c => c.telefone],
    ['E-mail', c => c.email],
    ['Origem', c => ORIGENS[c.origem] || c.origem],
    ['Plano', c => c.plano],
    ['Etapa', c => (c.etapa ? NOME_ETAPA[c.etapa] : 'Caixa de entrada')],
    ['Responsável', c => usuarioPorId(c.responsavel_id)?.nome],
    ['Valor', c => (c.valor_centavos === null ? '' : reais(c.valor_centavos))],
    ['Nota fiscal', c => c.nota_fiscal],
    ['Pago em', c => diaBr(c.pago_em)],
    ['Prazo', c => diaBr(c.prazo)],
    ['Arquivado em', c => (c.arquivado_em ? dataHora(c.arquivado_em) : '')],
    ['Descrição', c => c.descricao],
    ['Atividade a automatizar', c => c.atividade_manual],
    ['O que não muda', c => c.manter_inalterado],
    ['Observações', c => c.observacoes],
  ];
  // Excel em português usa ";" e precisa do BOM para entender os acentos.
  const celula = valor => {
    const texto = String(valor ?? '').replace(/\r?\n/g, ' ');
    return /[";]/.test(texto) || /^[=+\-@]/.test(texto) ? `"${texto.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : texto;
  };
  const linhas = [colunas.map(([t]) => t).join(';'), ...lista.map(c => colunas.map(([, f]) => celula(f(c))).join(';'))];
  const arquivoCsv = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = el('a');
  a.href = URL.createObjectURL(arquivoCsv);
  a.download = `plannex-${arquivo ? 'arquivo' : 'contatos'}-${hoje()}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  acoes.avisar(`${lista.length} ${lista.length === 1 ? 'contato exportado' : 'contatos exportados'}.`);
}
