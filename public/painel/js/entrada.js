// Caixa de entrada, Recusados, Arquivados e Concluídos.
// A caixa de entrada do administrador tem só os pedidos novos, com Aceitar (vai para o Andamento, em
// Notas e ordens) e Recusar (vai para Recusados, guardando o lead).
import { estado, acoes, ativos, usuarioPorId, eAdmin } from './estado.js';
import { etiquetasDaDemanda } from './etiquetas.js';
import {
  el, botao, link, icone, avatar, etiquetaServico, NOME_ETAPA, fechada, SERVICOS, ORIGENS, diaDe, hoje, diasEntre,
  relativo, dataHora, normalizar, textoBusca, reais, diaBr,
} from './util.js';
import { linkWhatsAppMensagem, momento, MOMENTOS } from './mensagens.js';
import { avaliarClassificacao } from './classificacao.js';

const filtro = { modo: 'todos', servico: '', texto: '', responsavel: '' };

// Listas na mesma tela: caixa de entrada (para o funcionário, as demandas dele em aberto),
// arquivo e concluídos (as demandas do funcionário que já chegaram em Entregue).
const TIPOS = {
  entrada: { data: 'criado_em', icone: 'entrada' },
  arquivo: { data: 'arquivado_em', icone: 'arquivo' },
  concluidos: { data: 'atualizado_em', icone: 'ok' },
  recusados: { data: 'recusado_em', icone: 'recusar' },
};

export function desenharEntrada(raiz, { arquivo = false, concluidos = false, recusados = false } = {}) {
  const admin = eAdmin();
  const tipo = arquivo ? 'arquivo' : concluidos ? 'concluidos' : recusados ? 'recusados' : 'entrada';
  // Administrador: a caixa de entrada é só o que ainda não foi aceito. Funcionário: as demandas dele em aberto.
  // O que chega em Entregue vai para Concluídos.
  const base = tipo === 'arquivo' ? estado.contatos.filter(c => c.arquivado_em)
    : tipo === 'recusados' ? estado.contatos.filter(c => c.recusado_em && !c.arquivado_em)
      : tipo === 'concluidos' ? ativos().filter(c => (admin ? c.etapa === 'concluido' : fechada(c.etapa)))
        : admin ? ativos().filter(c => !c.etapa) : ativos().filter(c => !fechada(c.etapa));
  const filtrar = () => {
    const busca = normalizar(filtro.texto);
    return base.filter(c =>
      (tipo !== 'entrada' || filtro.modo === 'todos' || !c.lido_em) &&
      (!filtro.servico || c.servico === filtro.servico) &&
      (tipo !== 'concluidos' || !filtro.responsavel || c.responsavel_id === Number(filtro.responsavel)) &&
      (!busca || textoBusca(c).includes(busca)));
  };
  const redesenhar = () => desenharEntrada(raiz, { arquivo, concluidos, recusados });

  const titulo = { arquivo: 'Arquivados', concluidos: 'Concluídos', recusados: 'Recusados' }[tipo] || 'Caixa de entrada';
  const cabecalho = el('header', 'tela-topo',
    el('div', '', el('h1', '', titulo)),
    admin ? botao('Exportar planilha', 'botao--fantasma', () => exportar(filtrar(), arquivo), { icone: 'baixar', titulo: 'Baixar os contatos desta lista em CSV (abre no Excel)' }) : null);

  const ferramentas = el('div', 'ferramentas');
  if (tipo === 'entrada') {
    if (filtro.modo === 'aguardando') filtro.modo = 'todos';
    ferramentas.append(segmentado([
      ['todos', 'Todos', base.length],
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
//   Caixa de entrada:     situação | WhatsApp | recusar e aceitar   (func.: situação | avançar)
//   Recusados:            recusado em | WhatsApp | aceitar e devolver
//   Arquivo:              situação | WhatsApp | responsável | ação
function linha(c, tipo) {
  const admin = eAdmin();
  const concluida = tipo === 'concluidos';
  const item = el('li', `contato contato--${c.servico}${c.lido_em || concluida ? '' : ' is-novo'}${concluida ? ' is-concluido' : ''}`);
  const responsavel = usuarioPorId(c.responsavel_id);
  const previa = c.descricao || c.atividade_manual || c.observacoes || '';
  // Na triagem (caixa de entrada do administrador), avisa quando serviço/plano não combinam com a descrição.
  const classificacao = admin && !c.etapa ? avaliarClassificacao(c) : { alerta: false };
  const abrir = () => acoes.abrirFicha(c.id);

  const principal = el('div', 'contato-principal',
    el('span', 'contato-marcador', c.lido_em || concluida ? '' : el('span', 'ponto-novo', el('span', 'sr', 'Não lido'))),
    avatar(c.nome),
    el('span', 'contato-texto',
      el('span', 'contato-linha1', el('strong', 'contato-nome', c.nome), etiquetaServico(c.servico), c.protocolo ? el('span', 'etiqueta-protocolo', c.protocolo) : null,
        classificacao.alerta ? el('span', 'etiqueta-conferir', icone('alerta'), 'Conferir classificação') : null, etiquetasDaDemanda(c)),
      el('span', 'contato-previa', previa || (c.email || c.telefone || 'Sem descrição'))));
  principal.tabIndex = 0;
  principal.setAttribute('role', 'button');
  if (classificacao.alerta) principal.dataset.alerta = classificacao.motivo;
  principal.title = classificacao.alerta ? `${classificacao.motivo} Abra para conferir.` : concluida ? `Ver a ficha de ${c.nome} · concluída em ${dataHora(c.atualizado_em)}` : `Abrir a ficha de ${c.nome} · chegou em ${dataHora(c.criado_em)}`;
  principal.addEventListener('click', abrir);
  principal.addEventListener('keydown', evento => {
    if (evento.target === principal && (evento.key === 'Enter' || evento.key === ' ')) { evento.preventDefault(); abrir(); }
  });

  // Células
  const situacao = el('div', 'celula celula--situacao',
    el('time', '', concluida ? `concluída ${relativo(c.atualizado_em)}` : relativo(c[TIPOS[tipo].data] || c.criado_em)),
    concluida
      ? el('span', 'etapa-pill etapa-pill--ok', icone('ok'), 'Concluída')
      : tipo === 'recusados'
        ? el('span', 'etapa-pill etapa-pill--recusado', 'Recusado')
        : c.etapa === 'revisado'
          ? el('span', 'etapa-pill etapa-pill--retificacao', icone('alerta'), 'Retificação')
          : el('span', `etapa-pill${c.etapa ? '' : ' etapa-pill--caixa'}${c.etapa === 'entregue' ? ' etapa-pill--ok' : ''}`,
            c.etapa === 'pedido' ? (c.iniciado_em ? 'Em andamento' : 'Novo pedido') : c.etapa ? NOME_ETAPA[c.etapa] : 'Novo pedido'));
  situacao.addEventListener('click', abrir);

  // WhatsApp com a mensagem do momento (recebida, recusada, aceite…).
  const whatsapp = linkWhatsAppMensagem(c, momento(c));
  const celulaWhatsapp = el('div', 'celula celula--icone',
    whatsapp ? link('', whatsapp, 'botao botao--icone botao--fantasma', { icone: 'whatsapp', novaAba: true, titulo: `WhatsApp para ${c.nome} · mensagem pronta: ${MOMENTOS[momento(c)]}` }) : null);

  const celulaResponsavel = el('div', 'celula celula--icone',
    responsavel ? avatar(responsavel.nome, 'avatar--pequeno') : el('span', 'sem-responsavel', icone('usuario'), el('span', 'sr', 'Sem responsável')));

  const temValor = c.valor_centavos !== null && c.valor_centavos !== undefined;
  const celulaValor = el('div', `celula celula--valor${temValor ? '' : ' is-vazio'}`, temValor ? reais(c.valor_centavos) : '—');
  if (!temValor) celulaValor.title = 'Sem valor registrado';

  const celulaAcao = el('div', 'celula celula--acao');
  if (tipo === 'arquivo') {
    celulaAcao.append(botao('Restaurar', 'botao--fantasma botao--pequeno', () => acoes.alterar(c.id, { arquivado: false }, 'Contato restaurado.'), { icone: 'restaurar' }));
  } else if (tipo === 'recusados') {
    celulaAcao.append(
      botao('Devolver', 'botao--fantasma botao--pequeno', () => acoes.alterar(c.id, { recusado: false }, `${c.nome} voltou para a caixa de entrada.`),
        { icone: 'restaurar', titulo: 'Tira dos recusados e devolve para a caixa de entrada' }),
      botao('Aceitar', 'botao--primario botao--pequeno', () => acoes.mover(c.id, 'nota_emitida'), { icone: 'ok', titulo: 'Aceitar o pedido: vai para o Andamento, em Notas e ordens' }));
  } else if (tipo === 'entrada' && admin) {
    celulaAcao.append(
      botao('Recusar', 'botao--fantasma botao--pequeno botao--recusar', () => acoes.recusar(c.id), { icone: 'recusar', titulo: 'Recusar: o pedido fica guardado em Recusados' }),
      botao('Aceitar', 'botao--primario botao--pequeno', () => acoes.mover(c.id, 'nota_emitida'), { icone: 'ok', titulo: 'Aceitar: vai para o Andamento, em Notas e ordens' }));
  } else if (tipo === 'entrada') {
    const avancar = botaoAvancar(c);
    if (avancar) celulaAcao.append(avancar);
  }

  let celulas;
  let modelo;
  if (concluida) {
    if (admin) {
      celulaAcao.append(botao('Reabrir', 'botao--fantasma botao--pequeno', () => acoes.mover(c.id, 'entregue'),
        { icone: 'restaurar', titulo: 'Devolve ao Andamento, na Conclusão' }));
    }
    celulas = admin ? [situacao, celulaWhatsapp, celulaResponsavel, celulaValor, celulaAcao] : [situacao];
    modelo = admin ? 'concluidos' : 'concluidos-func';
  } else if (tipo === 'entrada' && !admin) {
    celulas = [situacao, celulaAcao];
    modelo = 'entrada-func';
  } else if (tipo === 'entrada' || tipo === 'recusados') {
    celulas = [situacao, celulaWhatsapp, celulaAcao];
    modelo = 'caixa';
  } else {
    celulas = [situacao, celulaWhatsapp, celulaResponsavel, celulaAcao];
    modelo = 'arquivo';
  }

  item.append(principal, el('div', `contato-colunas contato-colunas--${modelo}`, celulas));
  return item;
}

// Funcionário: um botão por vez, para ele saber em que ponto está.
//   Pedido novo -> "Iniciar pedido"; em andamento -> "Entregar" (abre a aba Entregue para subir o arquivo);
//   Retificação -> "Entregar nova versão" (abre a Retificação).
function botaoAvancar(c) {
  if (c.etapa === 'pedido' && !c.iniciado_em) {
    return botao('Iniciar pedido', 'botao--primario botao--pequeno botao--avancar', () => acoes.iniciar(c.id), { icone: 'seta_dir', titulo: 'Avise que começou a trabalhar nesta demanda' });
  }
  if (c.etapa === 'pedido') {
    return botao('Entregar', 'botao--primario botao--pequeno botao--avancar', () => acoes.abrirFicha(c.id, 'entregue'), { icone: 'ok', titulo: 'Abre a aba Entregue para enviar o arquivo final e entregar' });
  }
  if (c.etapa === 'revisado') {
    return botao('Entregar nova versão', 'botao--primario botao--pequeno botao--avancar', () => acoes.abrirFicha(c.id, 'revisado'), { icone: 'ok', titulo: 'Abre a Retificação: veja o que ajustar e envie a nova versão' });
  }
  return null;
}

function vazio(tipo, totalBase) {
  if (totalBase) return el('div', 'vazio', icone('busca', 'icone vazio-icone'), el('p', '', 'Nenhum contato com esses filtros.'));
  const textos = {
    arquivo: 'O arquivo está vazio.',
    recusados: 'Nenhum pedido recusado. Os recusados ficam guardados aqui, com o contato, para retomar depois.',
    concluidos: 'Nenhuma demanda concluída ainda. Quando uma demanda chega em Entregue, ela aparece aqui.',
    entrada: eAdmin()
      ? 'Nenhum pedido novo. Os pedidos do site aparecem aqui assim que alguém enviar o formulário; os aceitos ficam no Andamento.'
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
