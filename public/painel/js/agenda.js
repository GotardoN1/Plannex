// Agenda: calendário do mês com prazos de entrega e pagamentos, e a lista dos próximos dias.
import { estado, acoes, ativos } from './estado.js';
import { el, botao, icone, NOME_ETAPA, hoje, somarDias, nomeMes, reais, situacaoPrazo, diaBr } from './util.js';

const visivel = { ano: null, mes: null };
const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

export function desenharAgenda(raiz) {
  const dia = hoje();
  if (visivel.ano === null) [visivel.ano, visivel.mes] = [Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1];
  const prefixo = `${visivel.ano}-${String(visivel.mes + 1).padStart(2, '0')}`;

  const eventos = montarEventos();
  const doMes = eventos.filter(e => e.dia.startsWith(prefixo));
  const recebido = doMes.filter(e => e.tipo === 'pagamento').reduce((s, e) => s + (e.contato.valor_centavos || 0), 0);
  const entregas = doMes.filter(e => e.tipo === 'prazo').length;

  const mudarMes = passo => {
    const data = new Date(Date.UTC(visivel.ano, visivel.mes + passo, 1));
    [visivel.ano, visivel.mes] = [data.getUTCFullYear(), data.getUTCMonth()];
    desenharAgenda(raiz);
  };

  const cabecalho = el('header', 'tela-topo',
    el('div', '',
      el('h1', '', 'Agenda'),
      el('p', '', 'Prazos de entrega e pagamentos recebidos. Defina o prazo e a data do pagamento na ficha de cada contato.')));

  const navegacao = el('div', 'agenda-nav',
    botao('', 'botao--icone botao--fantasma', () => mudarMes(-1), { icone: 'seta_esq', titulo: 'Mês anterior' }),
    el('h2', 'agenda-mes', maiuscula(nomeMes(visivel.ano, visivel.mes))),
    botao('', 'botao--icone botao--fantasma', () => mudarMes(1), { icone: 'seta_dir', titulo: 'Próximo mês' }),
    botao('Hoje', 'botao--fantasma botao--pequeno', () => { visivel.ano = null; desenharAgenda(raiz); }),
    el('div', 'agenda-resumo',
      el('span', '', el('i', 'ponto-evento ponto-evento--prazo'), `${entregas} ${entregas === 1 ? 'prazo' : 'prazos'}`),
      el('span', '', el('i', 'ponto-evento ponto-evento--pagamento'), `${reais(recebido)} recebidos`)));

  raiz.replaceChildren(cabecalho,
    el('div', 'agenda', el('section', 'calendario-caixa', navegacao, calendario(eventos, dia)), proximos(eventos, dia)));
}

function montarEventos() {
  const eventos = [];
  for (const c of estado.contatos) {
    if (c.prazo && !c.arquivado_em) eventos.push({ tipo: 'prazo', dia: c.prazo, contato: c });
    if (c.pago_em) eventos.push({ tipo: 'pagamento', dia: c.pago_em, contato: c });
  }
  return eventos.sort((a, b) => a.dia.localeCompare(b.dia));
}

function calendario(eventos, diaHoje) {
  const primeiro = `${visivel.ano}-${String(visivel.mes + 1).padStart(2, '0')}-01`;
  const deslocamento = (new Date(`${primeiro}T00:00:00Z`).getUTCDay() + 6) % 7;
  const inicio = somarDias(primeiro, -deslocamento);
  const porDia = new Map();
  for (const e of eventos) {
    if (!porDia.has(e.dia)) porDia.set(e.dia, []);
    porDia.get(e.dia).push(e);
  }

  const grade = el('div', 'calendario');
  grade.setAttribute('role', 'grid');
  for (const nome of DIAS_SEMANA) grade.append(el('div', 'calendario-semana', nome));
  for (let i = 0; i < 42; i++) {
    const dia = somarDias(inicio, i);
    // Não mostra a sexta linha quando ela é toda do mês seguinte.
    if (i === 35 && !dia.startsWith(primeiro.slice(0, 7))) break;
    const doMes = dia.startsWith(primeiro.slice(0, 7));
    const daData = porDia.get(dia) || [];
    const celula = el('div', `dia${doMes ? '' : ' dia--fora'}${dia === diaHoje ? ' dia--hoje' : ''}${daData.length ? ' dia--com-eventos' : ''}`);
    celula.append(el('span', 'dia-numero', String(Number(dia.slice(8)))));
    const lista = el('div', 'dia-eventos');
    for (const e of daData.slice(0, 3)) lista.append(chipEvento(e));
    if (daData.length > 3) lista.append(el('span', 'dia-mais', `+${daData.length - 3}`));
    // No celular, os eventos viram pontinhos.
    const pontos = el('span', 'dia-pontos', daData.slice(0, 4).map(e => el('i', `ponto-evento ponto-evento--${e.tipo}`)));
    celula.append(lista, pontos);
    grade.append(celula);
  }
  return grade;
}

function chipEvento(e) {
  const entregue = e.tipo === 'prazo' && e.contato.etapa === 'entregue';
  const prazo = e.tipo === 'prazo' && !entregue ? situacaoPrazo(e.contato.prazo) : null;
  const chip = el('button', `evento evento--${e.tipo}${entregue ? ' is-feito' : ''}${prazo?.classe === 'critico' ? ' is-atrasado' : ''}`,
    el('i', `ponto-evento ponto-evento--${e.tipo}`), e.contato.nome);
  chip.type = 'button';
  chip.title = e.tipo === 'pagamento'
    ? `${e.contato.nome}: pagamento de ${reais(e.contato.valor_centavos)}`
    : `${e.contato.nome}: prazo de entrega${entregue ? ' (entregue)' : ''}`;
  chip.addEventListener('click', () => acoes.abrirFicha(e.contato.id));
  return chip;
}

function proximos(eventos, diaHoje) {
  const limite = somarDias(diaHoje, 14);
  const atrasados = ativos().filter(c => c.prazo && c.etapa !== 'entregue' && c.prazo < diaHoje).sort((a, b) => a.prazo.localeCompare(b.prazo));
  const proximos = eventos.filter(e => e.tipo === 'prazo' && e.contato.etapa !== 'entregue' && e.dia >= diaHoje && e.dia <= limite);

  const item = (c, texto, classe) => {
    const b = el('button', `proximo proximo--${classe}`,
      el('span', 'proximo-data', el('b', '', diaBr(c.prazo).slice(0, 2)), el('small', '', nomeMesAbreviado(c.prazo))),
      el('span', 'proximo-texto', el('strong', '', c.nome), el('span', '', `${texto} · ${c.etapa ? NOME_ETAPA[c.etapa] : 'Caixa de entrada'}`)));
    b.type = 'button';
    b.addEventListener('click', () => acoes.abrirFicha(c.id));
    return el('li', '', b);
  };

  const lista = el('ul', 'proximos-lista',
    atrasados.map(c => item(c, situacaoPrazo(c.prazo).texto, 'critico')),
    proximos.map(e => item(e.contato, situacaoPrazo(e.contato.prazo).texto, situacaoPrazo(e.contato.prazo).classe)));

  return el('aside', 'proximos',
    el('h2', '', 'Próximos 14 dias'),
    atrasados.length || proximos.length ? lista : el('p', 'tudo-certo', icone('ok'), 'Nenhuma entrega prevista para as próximas duas semanas.'));
}

function nomeMesAbreviado(dia) {
  return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(dia.slice(5, 7)) - 1];
}


function maiuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
