// Caixa de entrada (todos os contatos ativos) e Arquivo (contatos arquivados).
import { estado, acoes, ativos, usuarioPorId, eAdmin } from './estado.js';
import {
  el, botao, link, icone, avatar, etiquetaServico, NOME_ETAPA, SERVICOS, ORIGENS, diaDe, hoje, diasEntre,
  relativo, dataHora, normalizar, textoBusca, linkWhatsApp, reais, diaBr,
} from './util.js';

const filtro = { modo: 'todos', servico: '', texto: '' };

export function desenharEntrada(raiz, { arquivo = false } = {}) {
  const base = arquivo ? estado.contatos.filter(c => c.arquivado_em) : ativos();
  const filtrar = () => {
    const busca = normalizar(filtro.texto);
    return base.filter(c =>
      (arquivo || filtro.modo === 'todos' || (filtro.modo === 'aguardando' ? !c.etapa : !c.lido_em)) &&
      (!filtro.servico || c.servico === filtro.servico) &&
      (!busca || textoBusca(c).includes(busca)));
  };
  const redesenhar = () => desenharEntrada(raiz, { arquivo });

  const aguardando = ativos().filter(c => !c.etapa).length;
  const naoLidos = ativos().filter(c => !c.lido_em).length;

  const admin = eAdmin();
  const cabecalho = el('header', 'tela-topo',
    el('div', '',
      el('h1', '', arquivo ? 'Arquivo' : admin ? 'Caixa de entrada' : 'Minhas demandas'),
      el('p', '', arquivo
        ? 'Contatos que não seguiram adiante. Nada se perde: dá para restaurar quando quiser.'
        : admin
          ? 'Todo contato que chega pelo site entra aqui. Abra para ver a ficha e mova para Pedido para começar o atendimento.'
          : 'As demandas em que você é o responsável. Abra para ver a ficha, anexar a ordem de serviço e avançar as etapas.')),
    admin ? botao('Exportar planilha', 'botao--fantasma', () => exportar(filtrar(), arquivo), { icone: 'baixar', titulo: 'Baixar os contatos desta lista em CSV (abre no Excel)' }) : null);

  const ferramentas = el('div', 'ferramentas');
  if (!arquivo) {
    ferramentas.append(segmentado([
      ['todos', 'Todos', ativos().length],
      ['aguardando', 'Aguardando', aguardando],
      ['nao-lidos', 'Não lidos', naoLidos],
    ], filtro.modo, valor => { filtro.modo = valor; redesenhar(); }));
  }
  const conteudo = el('div', 'lista-area');
  // O filtro de texto só redesenha a lista, para o campo não perder o foco.
  const pintarLista = () => {
    const lista = filtrar();
    conteudo.replaceChildren(lista.length ? agrupar(lista, arquivo) : vazio(arquivo, base.length));
  };
  ferramentas.append(
    listaSuspensa('Serviço', [['', 'Todos os serviços'], ['calculos', 'Cálculos'], ['automacao', 'Automação']], filtro.servico,
      valor => { filtro.servico = valor; redesenhar(); }),
    campoFiltro(filtro.texto, texto => { filtro.texto = texto; pintarLista(); }));

  pintarLista();
  raiz.replaceChildren(cabecalho, ferramentas, conteudo);
}

function agrupar(lista, arquivo) {
  const dia = hoje();
  const grupos = new Map();
  for (const c of lista) {
    const dias = diasEntre(diaDe(arquivo ? c.arquivado_em : c.criado_em), dia);
    const rotulo = dias === 0 ? 'Hoje' : dias === 1 ? 'Ontem' : dias < 7 ? 'Nesta semana' : dias < 31 ? 'Neste mês' : 'Mais antigos';
    if (!grupos.has(rotulo)) grupos.set(rotulo, []);
    grupos.get(rotulo).push(c);
  }
  return el('div', 'grupos', [...grupos].map(([rotulo, itens]) =>
    el('section', 'grupo', el('h2', 'grupo-titulo', rotulo, el('small', '', String(itens.length))),
      el('ul', 'lista-contatos', itens.map(c => linha(c, arquivo))))));
}

function linha(c, arquivo) {
  const item = el('li', `contato contato--${c.servico}${c.lido_em ? '' : ' is-novo'}`);
  const responsavel = usuarioPorId(c.responsavel_id);
  const previa = c.descricao || c.atividade_manual || c.observacoes || '';

  const principal = el('button', 'contato-principal',
    el('span', 'contato-marcador', c.lido_em ? '' : el('span', 'ponto-novo', el('span', 'sr', 'Não lido'))),
    avatar(c.nome),
    el('span', 'contato-texto',
      el('span', 'contato-linha1', el('strong', 'contato-nome', c.nome), etiquetaServico(c.servico),
        c.origem !== 'site' ? el('span', 'origem', ORIGENS[c.origem] || c.origem) : null,
        c.plano ? el('span', 'origem', c.plano) : null),
      el('span', 'contato-previa', previa || (c.email || c.telefone || 'Sem descrição'))),
    el('span', 'contato-lado',
      el('time', '', relativo(arquivo ? c.arquivado_em : c.criado_em)),
      el('span', `etapa-pill${c.etapa ? '' : ' etapa-pill--caixa'}${c.etapa === 'entregue' ? ' etapa-pill--ok' : ''}`,
        c.etapa ? NOME_ETAPA[c.etapa] : 'Aguardando')));
  principal.type = 'button';
  principal.title = `Abrir a ficha de ${c.nome} · chegou em ${dataHora(c.criado_em)}`;
  principal.addEventListener('click', () => acoes.abrirFicha(c.id));

  const rapidas = el('div', 'contato-acoes');
  const whatsapp = linkWhatsApp(c);
  if (whatsapp) rapidas.append(link('', whatsapp, 'botao botao--icone botao--fantasma', { icone: 'whatsapp', novaAba: true, titulo: `Chamar ${c.nome} no WhatsApp` }));
  if (responsavel) rapidas.append(avatar(responsavel.nome, 'avatar--pequeno'));
  if (arquivo) {
    rapidas.append(botao('Restaurar', 'botao--fantasma', () => acoes.alterar(c.id, { arquivado: false }, 'Contato restaurado.'), { icone: 'restaurar' }));
  } else if (!c.etapa) {
    rapidas.append(botao('Mover para Pedido', 'botao--primario', () => acoes.mover(c.id, 'pedido')));
  }
  item.append(principal, rapidas);
  return item;
}

function vazio(arquivo, totalBase) {
  if (totalBase) return el('div', 'vazio', icone('busca', 'icone vazio-icone'), el('p', '', 'Nenhum contato com esses filtros.'));
  return el('div', 'vazio', icone(arquivo ? 'arquivo' : 'entrada', 'icone vazio-icone'),
    el('p', '', arquivo ? 'O arquivo está vazio.' : 'Nenhum contato ainda. Os pedidos do site aparecem aqui assim que alguém enviar o formulário.'));
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
