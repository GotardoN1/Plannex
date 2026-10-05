// Financeiro (só administradores): a saúde da empresa nesse começo.
//   - Quanto entrou (demandas pagas), quanto fica para a Plannex e quanto vai para cada sócio.
//   - Sugestão de pagamento aos sócios no 5º dia útil do mês seguinte.
//   - Despesas da empresa (domínio, CORECON…): quando foram compradas e quando vencem de novo,
//     agrupadas por ano e mês, com aviso em amarelo (até 30 dias) e vermelho (até 7 dias ou vencida).
// Os percentuais e os nomes dos sócios ficam na aba Empresa.
import { estado, acoes } from './estado.js';
import { api } from './api.js';
import { el, botao, icone, reais, diaBr, hoje, lerReais, centavosParaCampo } from './util.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = chave => { const [a, m] = chave.split('-').map(Number); return `${MESES[m - 1]} de ${a}`; };
const maiuscula = t => t.charAt(0).toUpperCase() + t.slice(1);
const mesDe = data => String(data || '').slice(0, 7);
const somarMes = (chave, n) => { const [a, m] = chave.split('-').map(Number); const d = new Date(Date.UTC(a, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const diasAte = data => Math.round((Date.parse(`${data}T12:00:00Z`) - Date.parse(`${hoje()}T12:00:00Z`)) / 86400000);

// ---------- Dados ----------

export async function carregarFinanceiro() {
  estado.financeiro = await api('/api/financeiro');
  return estado.financeiro;
}

// Situação de uma despesa pelo vencimento: vencida e até 7 dias em vermelho, até 30 dias em amarelo.
export function situacaoDespesa(d) {
  if (d.encerrada_em) return { classe: 'encerrada', texto: 'Encerrada' };
  if (!d.vencimento) return { classe: 'sem', texto: 'Sem vencimento' };
  const dias = diasAte(d.vencimento);
  if (dias < 0) return { classe: 'vencida', texto: `Venceu há ${-dias} ${-dias === 1 ? 'dia' : 'dias'}` };
  if (dias === 0) return { classe: 'vencida', texto: 'Vence hoje' };
  if (dias <= 7) return { classe: 'urgente', texto: `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}` };
  if (dias <= 30) return { classe: 'atencao', texto: `Vence em ${dias} dias` };
  return { classe: 'ok', texto: `Vence em ${diaBr(d.vencimento)}` };
}

export function alertasFinanceiros(fin = estado.financeiro) {
  return (fin?.despesas || [])
    .map(d => ({ d, s: situacaoDespesa(d) }))
    .filter(x => ['vencida', 'urgente', 'atencao'].includes(x.s.classe))
    .sort((a, b) => String(a.d.vencimento).localeCompare(String(b.d.vencimento)));
}

// 5º dia útil do mês (segunda a sexta; feriados não entram na conta).
export function quintoDiaUtil(chaveMes) {
  const [a, m] = chaveMes.split('-').map(Number);
  let uteis = 0;
  for (let dia = 1; dia <= 31; dia++) {
    const data = new Date(Date.UTC(a, m - 1, dia));
    if (data.getUTCMonth() !== m - 1) break;
    const semana = data.getUTCDay();
    if (semana !== 0 && semana !== 6 && ++uteis === 5) return data.toISOString().slice(0, 10);
  }
  return null;
}

// Números por mês: recebido (demandas pagas), divisão e despesas pagas.
function porMes(fin) {
  const empresa = fin.empresa || {};
  const pctCasa = Number(empresa.pct_casa ?? 30) / 100;
  const pctSocio1 = Number(empresa.pct_socio1 ?? 50) / 100;
  const meses = new Map();
  const mes = chave => {
    if (!meses.has(chave)) meses.set(chave, { mes: chave, recebido: 0, calculos: 0, automacao: 0, pagamentos: 0, despesas: 0 });
    return meses.get(chave);
  };
  for (const c of estado.contatos) {
    if (!c.pago_em || !c.valor_centavos) continue;
    const m = mes(mesDe(c.pago_em));
    m.recebido += c.valor_centavos;
    m.pagamentos += 1;
    m[c.servico === 'automacao' ? 'automacao' : 'calculos'] += c.valor_centavos;
  }
  for (const p of fin.pagamentos || []) mes(mesDe(p.pago_em)).despesas += p.valor_centavos;
  for (const m of meses.values()) {
    m.casa = Math.round(m.recebido * pctCasa);
    const socios = m.recebido - m.casa;
    m.socio1 = Math.round(socios * pctSocio1);
    m.socio2 = socios - m.socio1;
    m.saldoCasa = m.casa - m.despesas;
  }
  return meses;
}

// ---------- Tela ----------

export async function desenharFinanceiro(raiz) {
  // Com dados em mãos, desenha na hora (sem piscar "Carregando…") e depois confere se mudou algo.
  if (estado.financeiro) desenhar(raiz);
  else raiz.replaceChildren(el('header', 'tela-topo', el('div', '', el('h1', '', 'Financeiro'))), el('p', 'vazio-mini', 'Carregando…'));
  const antes = JSON.stringify(estado.financeiro || null);
  try {
    await carregarFinanceiro();
  } catch (e) {
    if (!raiz.querySelector('.bloco')) raiz.replaceChildren(el('header', 'tela-topo', el('div', '', el('h1', '', 'Financeiro'))), el('p', 'aviso', e.message));
    return;
  }
  if (JSON.stringify(estado.financeiro) !== antes || !raiz.querySelector('.bloco')) desenhar(raiz);
}

function desenhar(raiz) {
  const abertos = new Set([...raiz.querySelectorAll('details[open][data-chave]')].map(d => d.dataset.chave));
  const jaDesenhado = Boolean(raiz.querySelector('.bloco--despesas'));
  desenharTudo(raiz);
  if (jaDesenhado) for (const d of raiz.querySelectorAll('details[data-chave]')) d.open = abertos.has(d.dataset.chave);
}

function desenharTudo(raiz) {
  const fin = estado.financeiro;
  const empresa = fin.empresa || {};
  const socio1 = empresa.socio1 || 'Sócio 1';
  const socio2 = empresa.socio2 || 'Sócio 2';
  const pctCasa = Number(empresa.pct_casa ?? 30);
  const pctSocio1 = Number(empresa.pct_socio1 ?? 50);
  const pctS1 = Math.round((100 - pctCasa) * pctSocio1) / 100;
  const pctS2 = Math.round((100 - pctCasa - pctS1) * 100) / 100;
  const meses = porMes(fin);
  const atual = hoje().slice(0, 7);
  const anterior = somarMes(atual, -1);
  const vazio = chave => ({ mes: chave, recebido: 0, calculos: 0, automacao: 0, pagamentos: 0, despesas: 0, casa: 0, socio1: 0, socio2: 0, saldoCasa: 0 });
  const mesAtual = meses.get(atual) || vazio(atual);
  const mesAnterior = meses.get(anterior) || vazio(anterior);
  const caixaCasa = [...meses.values()].reduce((s, m) => s + m.saldoCasa, 0);
  const aReceber = estado.contatos
    .filter(c => c.etapa && !c.pago_em && c.valor_centavos && !c.arquivado_em && !c.recusado_em)
    .reduce((s, c) => s + c.valor_centavos, 0);
  const alertas = alertasFinanceiros(fin);

  // Saúde: crítica com caixa negativo ou despesa vencida; atenção com mês no vermelho ou vencimento perto.
  const motivos = [];
  if (caixaCasa < 0) motivos.push(['critica', `O caixa da Plannex está negativo (${reais(caixaCasa)}): as despesas passaram da parte da casa.`]);
  const vencidas = alertas.filter(a => a.s.classe === 'vencida');
  if (vencidas.length) motivos.push(['critica', `${vencidas.length} ${vencidas.length === 1 ? 'despesa vencida' : 'despesas vencidas'}: ${vencidas.map(a => a.d.nome).join(', ')}.`]);
  if (mesAtual.saldoCasa < 0) motivos.push(['atencao', `Neste mês, as despesas (${reais(mesAtual.despesas)}) passam da parte da casa (${reais(mesAtual.casa)}).`]);
  const urgentes = alertas.filter(a => a.s.classe === 'urgente');
  if (urgentes.length) motivos.push(['atencao', `${urgentes.length} ${urgentes.length === 1 ? 'despesa vence' : 'despesas vencem'} nos próximos 7 dias.`]);
  if (!mesAtual.recebido && !mesAnterior.recebido) motivos.push(['atencao', 'Nenhum recebimento neste mês nem no anterior.']);
  const nivel = motivos.some(m => m[0] === 'critica') ? 'critica' : motivos.length ? 'atencao' : 'boa';
  const NIVEL = { boa: ['Saudável', 'ok'], atencao: ['Atenção', 'alerta'], critica: ['Crítica', 'alerta'] };

  const saude = el('section', `bloco saude saude--${nivel}`,
    el('div', 'bloco-topo', el('h2', 'titulo-icone', icone('dinheiro'), 'Saúde da empresa'), el('span', `saude-selo saude-selo--${nivel}`, icone(NIVEL[nivel][1]), NIVEL[nivel][0])),
    motivos.length
      ? el('ul', 'saude-motivos', motivos.map(([tipo, texto]) => el('li', `saude-motivo saude-motivo--${tipo}`, texto)))
      : el('p', 'saude-ok', 'Caixa da casa positivo, sem despesas vencidas e com recebimentos recentes.'));

  const variacao = mesAnterior.recebido ? Math.round(((mesAtual.recebido - mesAnterior.recebido) / mesAnterior.recebido) * 100) : null;
  const numeros = el('section', 'numeros numeros--financeiro', [
    tile('Recebido no mês', reais(mesAtual.recebido), maiuscula(nomeMes(atual)),
      variacao === null ? `${mesAtual.pagamentos} ${mesAtual.pagamentos === 1 ? 'pagamento' : 'pagamentos'}` : `${variacao >= 0 ? '↑' : '↓'} ${Math.abs(variacao)}% em relação a ${MESES[Number(anterior.slice(5)) - 1]}`),
    tile('Fica para a Plannex', reais(mesAtual.casa), `${pctCasa}% do recebido`, `despesas do mês: ${reais(mesAtual.despesas)}`),
    tile('Caixa da Plannex', reais(caixaCasa), 'acumulado', 'parte da casa menos as despesas pagas'),
    tile('A receber', reais(aReceber), 'demandas com valor', 'aceitas e ainda sem pagamento'),
  ]);

  // Sugestão de pagamento aos sócios: o mês fechado é pago no 5º dia útil do mês seguinte.
  const pagarFechado = quintoDiaUtil(atual);
  const pagarAtual = quintoDiaUtil(somarMes(atual, 1));
  const linhaPagamento = (rotulo, data, m, previa) => el('div', 'pagamento-socios',
    el('div', 'pagamento-data', el('strong', '', diaBr(data)), el('small', '', rotulo)),
    el('div', 'pagamento-valores',
      el('span', '', el('small', '', socio1), el('strong', '', reais(m.socio1))),
      el('span', '', el('small', '', socio2), el('strong', '', reais(m.socio2))),
      el('span', '', el('small', '', 'Fica na Plannex'), el('strong', '', reais(m.casa)))),
    el('p', 'pagamento-nota', previa
      ? `Prévia: ${nomeMes(m.mes)} ainda está em andamento (${reais(m.recebido)} recebidos até agora).`
      : `Referente a ${nomeMes(m.mes)}: ${reais(m.recebido)} recebidos.`));
  const pagamentos = el('section', 'bloco',
    el('div', 'bloco-topo', el('h2', 'titulo-icone', icone('agenda'), 'Pagamento dos sócios'), el('span', 'bloco-dica-topo', '5º dia útil do mês')),
    el('p', 'bloco-dica', `Divisão de cada R$ 100 recebidos: Plannex ${pctCasa}% · ${socio1} ${pctS1}% · ${socio2} ${pctS2}%. Ajuste na aba Empresa.`),
    diasAte(pagarFechado) >= 0 ? linhaPagamento(`pagamento de ${MESES[Number(anterior.slice(5)) - 1]}`, pagarFechado, mesAnterior, false) : null,
    linhaPagamento(`pagamento de ${MESES[Number(atual.slice(5)) - 1]}`, pagarAtual, mesAtual, true));

  // Mês a mês: o que entrou, a divisão e o que sobrou para a casa.
  const listaMeses = [...meses.values()].sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 12);
  const tabela = el('section', 'bloco',
    el('div', 'bloco-topo', el('h2', '', 'Mês a mês'), el('span', 'bloco-dica-topo', composicao(listaMeses.slice(0, 3)))),
    listaMeses.length
      ? el('div', 'tabela-rolagem', el('table', 'tabela-financeiro',
        el('thead', '', el('tr', '', ['Mês', 'Recebido', 'Plannex', socio1, socio2, 'Despesas', 'Saldo da casa'].map(t => el('th', '', t)))),
        el('tbody', '', listaMeses.map(m => el('tr', '',
          el('td', '', maiuscula(nomeMes(m.mes))), el('td', '', reais(m.recebido)), el('td', '', reais(m.casa)),
          el('td', '', reais(m.socio1)), el('td', '', reais(m.socio2)), el('td', '', reais(m.despesas)),
          el('td', m.saldoCasa < 0 ? 'is-negativo' : '', reais(m.saldoCasa)))))))
      : el('p', 'vazio-mini', 'Ainda não há recebimentos nem despesas registrados.'));

  raiz.replaceChildren(
    el('header', 'tela-topo', el('div', '', el('h1', '', 'Financeiro'), el('p', '', empresa.nome_fantasia ? `${empresa.nome_fantasia}${empresa.cnpj ? ` · CNPJ ${empresa.cnpj}` : ''}` : 'Cadastre os dados da empresa na aba Empresa.'))),
    alertas.length ? blocoAlertas(alertas) : null,
    el('div', 'grade-financeiro', saude, pagamentos),
    numeros,
    tabela,
    blocoDespesas(raiz));
}

function composicao(meses) {
  const calc = meses.reduce((s, m) => s + m.calculos, 0);
  const auto = meses.reduce((s, m) => s + m.automacao, 0);
  const total = calc + auto;
  if (!total) return '';
  return `Últimos 3 meses: cálculos ${Math.round((calc / total) * 100)}% · automação ${Math.round((auto / total) * 100)}%`;
}

function tile(rotulo, valor, quando, detalhe) {
  return el('div', 'tile tile--fixo', el('span', 'tile-rotulo', rotulo, ' ', el('small', '', quando)), el('strong', 'tile-valor', valor), el('span', 'tile-detalhe', detalhe));
}

function blocoAlertas(alertas) {
  return el('section', 'alertas-financeiro', alertas.map(({ d, s }) => el('p', `alerta-despesa alerta-despesa--${s.classe}`,
    icone('alerta'), el('strong', '', d.nome), ` · ${s.texto}${d.vencimento ? ` (${diaBr(d.vencimento)})` : ''}${d.valor_centavos ? ` · ${reais(d.valor_centavos)}` : ''}`)));
}

// ---------- Despesas ----------

const RENOVACAO = [['unica', 'Não renova'], ['mensal', 'Todo mês'], ['anual', 'Todo ano'], ['personalizada', 'A cada X meses']];
const VALIDADES = [['', 'Escolher data'], ['1', '1 mês'], ['3', '3 meses'], ['6', '6 meses'], ['12', '1 ano'], ['24', '2 anos'], ['36', '3 anos'], ['60', '5 anos']];
const CATEGORIAS = ['Site', 'Conselho', 'Serviços', 'Documentos', 'Impostos', 'Equipamentos', 'Software', 'Outros'];

function somarMesesData(data, meses) {
  const [a, m, d] = data.split('-').map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

function campo(rotulo, entrada, classe = '') {
  return el('label', `campo ${classe}`.trim(), rotulo, entrada);
}
function entradaTexto(nome, valor = '', extras = {}) {
  const e = el('input');
  e.name = nome;
  e.value = valor ?? '';
  Object.assign(e, extras);
  return e;
}
function selecao(nome, opcoes, valor) {
  const s = el('select');
  s.name = nome;
  for (const [v, t] of opcoes) { const o = el('option', '', t); o.value = v; s.append(o); }
  if (valor !== undefined && valor !== null) s.value = valor;
  return s;
}

// Formulário da despesa (novo ou edição). Validade rápida ("3 anos") preenche o vencimento a partir da compra.
function formularioDespesa(d = {}) {
  const nome = entradaTexto('nome', d.nome, { required: true, maxLength: 120, placeholder: 'Ex.: domínio, CORECON, contabilidade' });
  const categoria = entradaTexto('categoria', d.categoria, { maxLength: 60, placeholder: 'Ex.: Site' });
  const lista = el('datalist');
  lista.id = `categorias-${Math.random().toString(36).slice(2, 8)}`;
  for (const c of CATEGORIAS) { const o = el('option'); o.value = c; lista.append(o); }
  categoria.setAttribute('list', lista.id);
  const valor = entradaTexto('valor', centavosParaCampo(d.valor_centavos), { inputMode: 'decimal', placeholder: '0,00' });
  const inicio = entradaTexto('inicio', d.inicio || (d.id ? '' : hoje()), { type: 'date', min: '2000-01-01', max: '2100-12-31' });
  const validade = selecao('validade', VALIDADES, '');
  const vencimento = entradaTexto('vencimento', d.vencimento, { type: 'date', min: '2000-01-01', max: '2100-12-31' });
  const renova = selecao('recorrencia', RENOVACAO, d.recorrencia || 'unica');
  const meses = entradaTexto('meses', d.meses || '', { type: 'number', min: 1, max: 600, placeholder: 'meses' });
  const camposMeses = campo('A cada (meses)', meses);
  const observacao = entradaTexto('observacao', d.observacao, { maxLength: 600, placeholder: 'Ex.: entrada no mês 1, renova em 1 ano' });
  const jaPaga = entradaTexto('ja_paga', '', { type: 'checkbox', checked: !d.id });
  const sincronizar = () => { camposMeses.hidden = renova.value !== 'personalizada'; };
  validade.addEventListener('change', () => {
    if (!validade.value) return;
    const n = Number(validade.value);
    vencimento.value = somarMesesData(inicio.value || hoje(), n);
    if (renova.value === 'unica' || renova.value === 'personalizada') {
      renova.value = n === 1 ? 'mensal' : n === 12 ? 'anual' : 'personalizada';
      if (renova.value === 'personalizada') meses.value = String(n);
    }
    sincronizar();
  });
  renova.addEventListener('change', sincronizar);
  sincronizar();

  const form = el('div', 'form-despesa',
    el('div', 'campos-lado', campo('Nome', nome), campo('Categoria', categoria)), lista,
    el('div', 'campos-lado campos-lado--3', campo('Valor (R$)', valor), campo('Compra ou entrada', inicio), campo('Validade', validade)),
    el('div', 'campos-lado campos-lado--3', campo('Vence em', vencimento), campo('Renova', renova), camposMeses),
    campo('Observação', observacao),
    d.id ? null : el('label', 'campo-check', jaPaga, el('span', '', 'Já foi paga (entra nas despesas do mês da compra)')));
  form.ler = () => {
    const centavos = valor.value.trim() ? lerReais(valor.value) : null;
    return {
      erro: !nome.value.trim() ? 'Dê um nome à despesa.' : Number.isNaN(centavos) ? 'Valor inválido. Use, por exemplo, 49,90.' : '',
      dados: {
        nome: nome.value.trim(), categoria: categoria.value.trim(), valor_centavos: centavos, inicio: inicio.value || null,
        vencimento: vencimento.value || null, recorrencia: renova.value, meses: renova.value === 'personalizada' ? Number(meses.value) : null,
        observacao: observacao.value.trim(), ja_paga: !d.id && jaPaga.checked,
      },
    };
  };
  return form;
}

function blocoDespesas(raiz) {
  const fin = estado.financeiro;
  const despesas = fin.despesas || [];
  const pagos = new Map();
  for (const p of fin.pagamentos || []) pagos.set(p.despesa_id, [...(pagos.get(p.despesa_id) || []), p]);

  // Nova despesa (recolhido até abrir).
  const form = formularioDespesa();
  const salvar = botao('Registrar despesa', 'botao--primario', async () => {
    const { erro, dados } = form.ler();
    if (erro) { acoes.avisar(erro, 'erro'); return; }
    salvar.disabled = true;
    try {
      await api('/api/despesas', { method: 'POST', corpo: dados });
      acoes.avisar(`${dados.nome} registrada.`);
      await desenharFinanceiro(raiz);
    } catch (e) {
      acoes.avisar(e.message, 'erro');
      salvar.disabled = false;
    }
  }, { icone: 'mais' });
  const nova = el('details', 'nova-despesa', el('summary', '', icone('mais'), 'Registrar despesa'), form, el('div', 'form-acoes', salvar));
  nova.dataset.chave = 'nova';

  // Agrupadas por ano e, dentro do ano, por mês do vencimento (ou da compra, se não vence).
  const ativas = despesas.filter(d => !d.encerrada_em);
  const encerradas = despesas.filter(d => d.encerrada_em);
  const anos = new Map();
  for (const d of ativas) {
    const data = d.vencimento || d.inicio || '';
    const ano = data ? data.slice(0, 4) : 'Sem data';
    const mes = data ? data.slice(0, 7) : 'sem';
    if (!anos.has(ano)) anos.set(ano, new Map());
    const doAno = anos.get(ano);
    if (!doAno.has(mes)) doAno.set(mes, []);
    doAno.get(mes).push(d);
  }
  const anoAtual = hoje().slice(0, 4);
  const grupos = [...anos.keys()].sort().map(ano => {
    const doAno = anos.get(ano);
    const total = [...doAno.values()].flat().reduce((s, d) => s + (d.valor_centavos || 0), 0);
    const alerta = [...doAno.values()].flat().some(d => ['vencida', 'urgente', 'atencao'].includes(situacaoDespesa(d).classe));
    const grupo = el('details', 'despesas-ano',
      el('summary', '', el('strong', '', ano), el('span', '', `${[...doAno.values()].flat().length} ${[...doAno.values()].flat().length === 1 ? 'despesa' : 'despesas'} · ${reais(total)}`), alerta ? el('span', 'ponto-alerta', '') : null),
      [...doAno.keys()].sort().map(mes => el('div', 'despesas-mes',
        el('h4', '', mes === 'sem' ? 'Sem data' : maiuscula(MESES[Number(mes.slice(5)) - 1])),
        el('ul', 'despesas', doAno.get(mes).map(d => linhaDespesa(d, pagos.get(d.id) || [], raiz))))));
    grupo.open = ano <= String(Number(anoAtual) + 1) || alerta;
    grupo.dataset.chave = `ano-${ano}`;
    return grupo;
  });
  const fechadas = encerradas.length
    ? el('details', 'despesas-ano despesas-ano--encerradas', el('summary', '', el('strong', '', 'Encerradas'), el('span', '', String(encerradas.length))),
      el('ul', 'despesas', encerradas.map(d => linhaDespesa(d, pagos.get(d.id) || [], raiz))))
    : null;

  return el('section', 'bloco bloco--despesas',
    el('div', 'bloco-topo', el('h2', 'titulo-icone', icone('nota'), 'Despesas e vencimentos'), el('span', 'bloco-dica-topo', 'agrupadas por ano e mês do vencimento')),
    nova,
    despesas.length ? el('div', 'despesas-grupos', grupos, fechadas) : el('p', 'vazio-mini', 'Nenhuma despesa registrada. Comece pelo domínio, pelo CORECON ou pela contabilidade.'));
}

function linhaDespesa(d, pagamentos, raiz) {
  const s = situacaoDespesa(d);
  const ultimo = pagamentos[pagamentos.length - 1];
  const RENOVA = { unica: 'não renova', mensal: 'renova todo mês', anual: 'renova todo ano', personalizada: `renova a cada ${d.meses} ${d.meses === 1 ? 'mês' : 'meses'}` };
  const info = [
    d.categoria,
    d.inicio ? `comprada em ${diaBr(d.inicio)}` : null,
    RENOVA[d.recorrencia],
    ultimo ? `último pagamento ${diaBr(ultimo.pago_em)}` : 'nenhum pagamento registrado',
  ].filter(Boolean).join(' · ');

  const renovar = async () => {
    const valor = entradaTexto('valor', centavosParaCampo(d.valor_centavos), { inputMode: 'decimal' });
    const data = entradaTexto('data', hoje(), { type: 'date' });
    const extra = el('div', 'campos-lado', campo('Valor pago (R$)', valor), campo('Pago em', data));
    const ok = await acoes.confirmar({
      titulo: d.recorrencia === 'unica' ? `Registrar o pagamento de ${d.nome}?` : `Renovar ${d.nome}?`,
      texto: d.recorrencia === 'unica' ? 'O pagamento entra nas despesas do mês.' : 'O pagamento entra nas despesas do mês e o vencimento passa para o próximo ciclo.',
      botao: d.recorrencia === 'unica' ? 'Registrar pagamento' : 'Renovar',
      extra,
      validar: () => (Number.isNaN(lerReais(valor.value)) ? 'Valor inválido.' : data.value ? '' : 'Informe a data do pagamento.'),
    });
    if (!ok) return;
    try {
      const r = await api(`/api/despesas/${d.id}/renovar`, { method: 'POST', corpo: { valor_centavos: lerReais(valor.value), pago_em: data.value } });
      acoes.avisar(r.vencimento && r.vencimento !== d.vencimento ? `${d.nome}: próximo vencimento em ${diaBr(r.vencimento)}.` : `Pagamento de ${d.nome} registrado.`);
      await desenharFinanceiro(raiz);
    } catch (e) { acoes.avisar(e.message, 'erro'); }
  };
  const editar = async () => {
    const form = formularioDespesa(d);
    const encerrar = entradaTexto('encerrada', '', { type: 'checkbox', checked: Boolean(d.encerrada_em) });
    form.append(el('label', 'campo-check', encerrar, el('span', '', 'Encerrada (não usamos mais; sai dos avisos)')));
    const ok = await acoes.confirmar({ titulo: `Editar ${d.nome}`, texto: '', botao: 'Salvar', extra: form, validar: () => form.ler().erro });
    if (!ok) return;
    try {
      await api(`/api/despesas/${d.id}`, { method: 'PATCH', corpo: { ...form.ler().dados, encerrada: encerrar.checked } });
      acoes.avisar('Despesa salva.');
      await desenharFinanceiro(raiz);
    } catch (e) { acoes.avisar(e.message, 'erro'); }
  };
  const excluir = async () => {
    const ok = await acoes.confirmar({ titulo: `Excluir ${d.nome}?`, texto: 'A despesa e os pagamentos registrados dela saem do Financeiro. Não dá para desfazer.', botao: 'Excluir' });
    if (!ok) return;
    try {
      await api(`/api/despesas/${d.id}`, { method: 'DELETE' });
      acoes.avisar(`${d.nome} excluída.`);
      await desenharFinanceiro(raiz);
    } catch (e) { acoes.avisar(e.message, 'erro'); }
  };

  return el('li', `despesa despesa--${s.classe}`,
    el('div', 'despesa-texto',
      el('strong', '', d.nome),
      el('small', '', info),
      d.observacao ? el('small', 'despesa-obs', d.observacao) : null),
    el('div', 'despesa-lado',
      d.valor_centavos !== null && d.valor_centavos !== undefined ? el('span', 'despesa-valor', reais(d.valor_centavos)) : null,
      el('span', `situacao-despesa situacao-despesa--${s.classe}`, s.texto)),
    el('div', 'despesa-acoes',
      d.encerrada_em ? null : botao(d.recorrencia === 'unica' ? 'Pagar' : 'Renovar', 'botao--fantasma botao--pequeno', renovar, { icone: 'restaurar', titulo: d.recorrencia === 'unica' ? 'Registrar o pagamento' : 'Registrar o pagamento e passar o vencimento para o próximo ciclo' }),
      botao('', 'botao--icone botao--fantasma botao--pequeno', editar, { icone: 'editar', titulo: 'Editar' }),
      botao('', 'botao--icone botao--fantasma botao--pequeno', excluir, { icone: 'lixo', titulo: 'Excluir' })));
}
