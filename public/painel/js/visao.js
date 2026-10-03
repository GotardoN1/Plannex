// Visão geral: números do momento, contatos por mês, funil, pendências e atividade recente.
import { estado, acoes, ativos } from './estado.js';
import { api } from './api.js';
import {
  el, svg, icone, botao, ETAPAS, NOME_ETAPA, CAIXA, SERVICOS, diaDe, hoje, diasEntre, somarDias,
  reais, reaisCurto, relativo, situacaoPrazo, primeiroNome, extenso, nomeMesCurto, diaBr, hora, nomeExibicao,
} from './util.js';

// Cores de gráfico validadas para o fundo escuro (validate_palette: todas as checagens passam).
const COR = { calculos: '#d4793f', automacao: '#4f97e3' };
const ORDEM_SERIES = ['calculos', 'automacao'];

export function desenharVisao(raiz) {
  const dia = hoje();
  const mes = dia.slice(0, 7);
  const [ano, numMes] = mes.split('-').map(Number);
  const todos = estado.contatos;
  const lista = ativos();

  const idade = c => diasEntre(diaDe(c.criado_em), dia);
  const novos7 = todos.filter(c => idade(c) < 7).length;
  const novosAntes = todos.filter(c => idade(c) >= 7 && idade(c) < 14).length;
  const naoLidos = lista.filter(c => !c.lido_em).length;
  const naCaixa = lista.filter(c => !c.etapa).length;
  const emAndamento = lista.filter(c => c.etapa && c.etapa !== 'entregue');
  const aReceber = emAndamento.filter(c => !c.pago_em).reduce((s, c) => s + (c.valor_centavos || 0), 0);
  const diaEntrega = c => (c.etapa === 'entregue' && c.atualizado_em ? diaDe(c.atualizado_em) : null);
  const mesPagamentos = mesDeReferencia(todos.map(c => c.pago_em), mes);
  const mesEntregas = mesDeReferencia(todos.map(diaEntrega), mes);
  const pagosMes = todos.filter(c => c.pago_em?.startsWith(mesPagamentos));
  const faturado = pagosMes.reduce((s, c) => s + (c.valor_centavos || 0), 0);
  const entreguesMes = todos.filter(c => diaEntrega(c)?.startsWith(mesEntregas));
  const tempoMedio = entreguesMes.length
    ? Math.round(entreguesMes.reduce((s, c) => s + diasEntre(diaDe(c.criado_em), diaDe(c.atualizado_em)), 0) / entreguesMes.length)
    : null;
  const pendencias = calcularPendencias(lista, dia);
  const prazosSemana = lista.filter(c => c.prazo && c.etapa !== 'entregue' && diasEntre(dia, c.prazo) >= 0 && diasEntre(dia, c.prazo) <= 7).length;

  // ---------- Saudação ----------
  const horaAgora = Number(hora(new Date().toISOString()).slice(0, 2));
  const saudacao = horaAgora < 12 ? 'Bom dia' : horaAgora < 18 ? 'Boa tarde' : 'Boa noite';
  const chamar = estado.usuario?.apelido || primeiroNome(nomeExibicao(estado.usuario));
  const topo = el('header', 'visao-topo',
    el('div', '',
      el('p', 'visao-data', maiuscula(extenso())),
      el('h1', 'visao-titulo', `${saudacao}, ${chamar}.`)));

  // ---------- Números ----------
  const diferenca = novos7 - novosAntes;
  const numeros = el('section', 'numeros', [
    tile('Novos contatos', novos7, '7 dias',
      diferenca === 0 ? 'igual à semana anterior' : `${diferenca > 0 ? '↑' : '↓'} ${Math.abs(diferenca)} em relação à semana anterior`,
      () => acoes.navegar('entrada')),
    tile('Em andamento', emAndamento.length, 'agora',
      aReceber ? `${reais(aReceber)} ainda a receber` : 'nada pendente de pagamento',
      () => acoes.navegar('andamento')),
    tile('Recebido', reaisCurto(faturado), nomeDoMes(mesPagamentos),
      pagosMes.length ? `${pagosMes.length} ${pagosMes.length === 1 ? 'pagamento' : 'pagamentos'}${mesPagamentos === mes ? ' no mês' : ' (último mês com pagamento)'}` : 'nenhum pagamento ainda',
      () => acoes.navegar('agenda')),
    tile('Entregues', entreguesMes.length, nomeDoMes(mesEntregas),
      tempoMedio === null ? 'nenhuma entrega ainda' : `em média ${tempoMedio} ${tempoMedio === 1 ? 'dia' : 'dias'} do contato à entrega${mesEntregas === mes ? '' : ' (último mês com entrega)'}`,
      () => acoes.navegar('concluidos')),
  ]);

  // ---------- Gráficos ----------
  const graficoSemanas = cartao('Contatos por mês', graficoPorMes(todos, mes));
  const graficoServicos = cartao('Por serviço', divisaoServicos(todos.filter(c => idade(c) < 90)));
  const funil = cartao('Onde estão os contatos', funilEtapas(lista));
  const atencao = cartao('Precisa de atenção', listaPendencias(pendencias));
  const atividade = cartao('Atividade recente', feedAtividade());

  raiz.replaceChildren(topo, numeros,
    el('div', 'grade-visao', graficoSemanas, graficoServicos, funil, atencao, atividade));
}

function tile(rotulo, valor, periodo, detalhe, aoClicar) {
  const t = el('button', 'tile', el('span', 'tile-rotulo', rotulo, el('small', '', ` · ${periodo}`)), el('strong', 'tile-valor', String(valor)), el('span', 'tile-detalhe', detalhe));
  t.type = 'button';
  t.addEventListener('click', aoClicar);
  return t;
}

function cartao(titulo, conteudo) {
  return el('section', 'cartao-visao', el('header', '', el('h2', '', titulo)), conteudo);
}

// O mês atual, se já tem algum registro; senão, o último mês (até hoje) que teve. Assim, no começo,
// quando nem todo mês tem venda, o número não fica zerado.
function mesDeReferencia(dias, mesAtual) {
  const meses = dias.filter(Boolean).map(d => d.slice(0, 7)).filter(m => m <= mesAtual).sort();
  if (!meses.length || meses.includes(mesAtual)) return mesAtual;
  return meses.at(-1);
}

function nomeDoMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return nomeMesCurto(a, m - 1);
}

// ---------- Contatos por mês (barras empilhadas) ----------
// Últimos 12 meses, mas só os que tiveram contato ou venda: no começo, nem todo mês tem.

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function rotuloMes(mes, comAno) {
  const [a, m] = mes.split('-');
  return comAno ? `${MESES_CURTOS[Number(m) - 1]}/${a.slice(2)}` : MESES_CURTOS[Number(m) - 1];
}

function graficoPorMes(contatos, mesAtual) {
  const [a, m] = mesAtual.split('-').map(Number);
  const ultimos = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (11 - i), 1));
    return d.toISOString().slice(0, 7);
  });
  const porMes = new Map(ultimos.map(mes => [mes, { mes, calculos: 0, automacao: 0, vendas: 0 }]));
  for (const c of contatos) {
    const doContato = porMes.get(diaDe(c.criado_em).slice(0, 7));
    if (doContato) doContato[c.servico] = (doContato[c.servico] || 0) + 1;
    const daVenda = c.pago_em ? porMes.get(c.pago_em.slice(0, 7)) : null;
    if (daVenda) daVenda.vendas += 1;
  }
  const meses = [...porMes.values()].filter(x => x.calculos + x.automacao + x.vendas > 0);
  const comAno = new Set(meses.map(x => x.mes.slice(0, 4))).size > 1;

  const caixa = el('div', 'grafico');
  if (!meses.length) {
    caixa.append(el('p', 'vazio-mini', 'Ainda não há contatos nem vendas registrados.'));
    return caixa;
  }
  const legenda = el('div', 'legenda', ORDEM_SERIES.map(s => el('span', 'legenda-item', amostra(s), SERVICOS[s].nome)));
  const area = el('div', 'grafico-area');
  const dica = el('div', 'dica');
  dica.hidden = true;
  area.append(dica);

  const tabela = el('table', 'tabela-dados',
    el('thead', '', el('tr', '', el('th', '', 'Mês'), el('th', '', 'Cálculos'), el('th', '', 'Automação'), el('th', '', 'Total'), el('th', '', 'Vendas'))),
    el('tbody', '', meses.map(x => el('tr', '', el('td', '', rotuloMes(x.mes, true)), el('td', '', x.calculos), el('td', '', x.automacao), el('td', '', x.calculos + x.automacao), el('td', '', x.vendas)))));
  const detalhes = el('details', 'ver-dados', el('summary', '', 'Ver como tabela'), tabela);

  caixa.append(legenda, area, detalhes);
  // Desenha logo depois de entrar na página, para saber a largura disponível.
  setTimeout(() => { if (area.isConnected) desenharBarras(area, dica, meses, comAno); }, 0);
  observarLargura(area, () => desenharBarras(area, dica, meses, comAno));
  return caixa;
}

function desenharBarras(area, dica, meses, comAno) {
  area.querySelector('svg')?.remove();
  const largura = Math.max(280, area.clientWidth);
  const altura = 210;
  const margem = { topo: 22, direita: 8, base: 26, esquerda: 28 };
  const larguraUtil = largura - margem.esquerda - margem.direita;
  const alturaUtil = altura - margem.topo - margem.base;
  const maximo = Math.max(4, ...meses.map(x => x.calculos + x.automacao));
  const passo = maximo <= 5 ? 1 : maximo <= 10 ? 2 : Math.ceil(maximo / 5);
  const topoEscala = Math.ceil(maximo / passo) * passo;
  const y = v => margem.topo + alturaUtil - (v / topoEscala) * alturaUtil;
  const coluna = larguraUtil / meses.length;
  const barra = Math.min(44, coluna * 0.56);

  const grafico = svg('svg', { viewBox: `0 0 ${largura} ${altura}`, width: largura, height: altura, role: 'img', 'aria-label': 'Contatos por mês' });
  for (let v = 0; v <= topoEscala; v += passo) {
    grafico.append(
      svg('line', { x1: margem.esquerda, x2: largura - margem.direita, y1: y(v), y2: y(v), class: v === 0 ? 'eixo-base' : 'grade' }),
      svg('text', { x: margem.esquerda - 8, y: y(v) + 4, class: 'eixo-texto', 'text-anchor': 'end' }, String(v)));
  }

  const rotularCada = coluna < 34 ? 2 : 1;
  meses.forEach((x0, i) => {
    const x = margem.esquerda + coluna * i + (coluna - barra) / 2;
    const total = x0.calculos + x0.automacao;
    let base = 0;
    const series = ORDEM_SERIES.filter(serie => x0[serie] > 0);
    series.forEach((serie, j) => {
      const yTopo = y(base + x0[serie]);
      const yBase = y(base);
      // 2px de folga entre os segmentos empilhados; só o topo da pilha é arredondado.
      const folga = j > 0 ? 2 : 0;
      const ultimo = j === series.length - 1;
      grafico.append(svg('path', { d: retangulo(x, yTopo, barra, Math.max(1, yBase - yTopo - folga), ultimo ? 4 : 0), fill: COR[serie] }));
      base += x0[serie];
    });
    // Rótulo só no último mês.
    if (i === meses.length - 1 && total) {
      grafico.append(svg('text', { x: x + barra / 2, y: y(total) - 7, class: 'valor-texto', 'text-anchor': 'middle' }, String(total)));
    }
    if ((meses.length - 1 - i) % rotularCada === 0) {
      grafico.append(svg('text', { x: x + barra / 2, y: altura - 7, class: 'eixo-texto', 'text-anchor': 'middle' }, rotuloMes(x0.mes, comAno)));
    }
    // Área de toque maior que a barra, para a dica.
    const alvo = svg('rect', { x: margem.esquerda + coluna * i, y: margem.topo, width: coluna, height: alturaUtil, class: 'alvo' });
    const mostrar = () => {
      dica.replaceChildren(
        el('strong', '', rotuloMes(x0.mes, true)),
        el('span', '', amostra('calculos'), `Cálculos: ${x0.calculos}`),
        el('span', '', amostra('automacao'), `Automação: ${x0.automacao}`),
        el('span', 'dica-total', `Total: ${total}`),
        el('span', '', `Vendas no mês: ${x0.vendas}`));
      dica.hidden = false;
      const posicao = Math.min(Math.max(x + barra / 2 - 70, 0), largura - 150);
      dica.style.left = `${posicao}px`;
      dica.style.top = `${Math.max(0, y(total) - 110)}px`;
      alvo.classList.add('is-ativo');
    };
    const esconder = () => { dica.hidden = true; alvo.classList.remove('is-ativo'); };
    alvo.addEventListener('pointerenter', mostrar);
    alvo.addEventListener('pointerleave', esconder);
    alvo.addEventListener('click', mostrar);
    grafico.append(alvo);
  });
  area.append(grafico);
}

// Retângulo com os dois cantos de cima arredondados.
function retangulo(x, y, largura, altura, raio) {
  const r = Math.min(raio, altura, largura / 2);
  return `M${x},${y + altura}V${y + r}Q${x},${y} ${x + r},${y}H${x + largura - r}Q${x + largura},${y} ${x + largura},${y + r}V${y + altura}Z`;
}

function amostra(serie) {
  return el('i', `amostra amostra--${serie}`);
}

function observarLargura(elemento, aoMudar) {
  let ultima = 0;
  let espera;
  const observador = new ResizeObserver(([entrada]) => {
    // Saiu da página (a tela foi redesenhada): para de observar.
    if (!elemento.isConnected) { observador.disconnect(); return; }
    const largura = Math.round(entrada.contentRect.width);
    if (!ultima) { ultima = largura; return; }
    if (Math.abs(largura - ultima) < 8) return;
    ultima = largura;
    clearTimeout(espera);
    espera = setTimeout(aoMudar, 120);
  });
  observador.observe(elemento);
}

// ---------- Divisão por serviço ----------

function divisaoServicos(contatos) {
  const total = contatos.length;
  if (!total) return el('p', 'vazio-mini', 'Ainda não há contatos nos últimos 90 dias.');
  const partes = ORDEM_SERIES.map(s => ({ serie: s, n: contatos.filter(c => c.servico === s).length }));
  const barra = el('div', 'divisao', partes.filter(p => p.n).map(p => {
    const segmento = el('span', `divisao-parte divisao-parte--${p.serie}`);
    segmento.style.flexGrow = String(p.n);
    segmento.title = `${SERVICOS[p.serie].nome}: ${p.n}`;
    return segmento;
  }));
  const convertidos = contatos.filter(c => c.etapa).length;
  return el('div', 'divisao-caixa', barra,
    el('ul', 'divisao-legenda', partes.map(p => el('li', '', amostra(p.serie),
      el('span', '', SERVICOS[p.serie].nome), el('strong', '', String(p.n)), el('small', '', `${Math.round((p.n / total) * 100)}%`)))),
    el('div', 'conversao', el('strong', '', `${Math.round((convertidos / total) * 100)}%`),
      el('span', '', `dos contatos viraram pedido (${convertidos} de ${total})`)));
}

// ---------- Funil ----------

function funilEtapas(contatos) {
  const linhas = [[null, CAIXA], ...ETAPAS].map(([chave, nome]) => ({ chave, nome, n: contatos.filter(c => (c.etapa || null) === chave).length }));
  const maximo = Math.max(1, ...linhas.map(l => l.n));
  return el('ol', 'funil', linhas.map(l => {
    const preenchimento = el('span', 'funil-barra');
    preenchimento.style.width = `${l.n ? Math.max(3, (l.n / maximo) * 100) : 0}%`;
    const item = el('button', 'funil-linha', el('span', 'funil-nome', l.nome), el('span', 'funil-trilho', preenchimento), el('strong', 'funil-valor', String(l.n)));
    item.type = 'button';
    const destino = l.chave === 'entregue' ? 'concluidos' : l.chave ? 'andamento' : 'entrada';
    item.title = destino === 'concluidos' ? 'Ver os concluídos' : l.chave ? `Ver ${l.nome} no andamento` : 'Ver a caixa de entrada';
    item.addEventListener('click', () => acoes.navegar(destino));
    return el('li', '', item);
  }));
}

// ---------- Pendências ----------

const PESO = { critico: 0, alerta: 1, neutro: 2 };

function calcularPendencias(contatos, dia) {
  const itens = [];
  for (const c of contatos) {
    const prazo = c.etapa !== 'entregue' ? situacaoPrazo(c.prazo) : null;
    if (prazo && prazo.classe !== 'neutro') {
      itens.push({ contato: c, nivel: prazo.classe, icone: prazo.classe === 'critico' ? 'alerta' : 'relogio', texto: `Prazo ${prazo.texto}`, ordem: prazo.dias });
    }
    if (!c.etapa) {
      const espera = diasEntre(diaDe(c.criado_em), dia);
      if (espera >= 2) itens.push({ contato: c, nivel: espera >= 4 ? 'critico' : 'alerta', icone: 'entrada', texto: `Na caixa de entrada há ${espera} dias`, ordem: -espera });
      else if (!c.lido_em) itens.push({ contato: c, nivel: 'neutro', icone: 'entrada', texto: `Chegou ${relativo(c.criado_em)}, ainda não lido`, ordem: 0 });
    }
    if (c.etapa === 'nota_emitida' && !c.pago_em && c.atualizado_em) {
      const dias = diasEntre(diaDe(c.atualizado_em), dia);
      if (dias >= 5) itens.push({ contato: c, nivel: 'alerta', icone: 'dinheiro', texto: `Em Notas e ordens há ${dias} dias, sem pagamento registrado`, ordem: -dias });
    }
    if (c.etapa && c.etapa !== 'entregue' && !(c.etapa === 'nota_emitida' && !c.pago_em) && c.atualizado_em) {
      const parado = diasEntre(diaDe(c.atualizado_em), dia);
      if (parado >= 7) itens.push({ contato: c, nivel: 'neutro', icone: 'relogio', texto: `Parado em ${NOME_ETAPA[c.etapa]} há ${parado} dias`, ordem: -parado });
    }
  }
  return itens.sort((a, b) => PESO[a.nivel] - PESO[b.nivel] || a.ordem - b.ordem);
}

function listaPendencias(itens) {
  if (!itens.length) return el('p', 'tudo-certo', icone('ok'), 'Nenhum prazo vencendo e ninguém esperando resposta.');
  const visiveis = itens.slice(0, 7);
  const lista = el('ul', 'pendencias', visiveis.map(item => {
    const linha = el('button', `pendencia pendencia--${item.nivel}`,
      el('span', 'pendencia-icone', icone(item.icone)),
      el('span', 'pendencia-texto', el('strong', '', item.contato.nome), el('span', '', item.texto)),
      el('span', 'pendencia-nivel', item.nivel === 'critico' ? 'Urgente' : item.nivel === 'alerta' ? 'Atenção' : 'Aviso'));
    linha.type = 'button';
    linha.addEventListener('click', () => acoes.abrirFicha(item.contato.id));
    return el('li', '', linha);
  }));
  return itens.length > visiveis.length ? el('div', '', lista, el('p', 'mais-itens', `e mais ${itens.length - visiveis.length}.`)) : lista;
}

// ---------- Atividade recente ----------

// "Ver mais": começa com 12 e vai abrindo de 15 em 15; o que é mais antigo que as 30 primeiras
// movimentações vem do servidor aos poucos (/api/atividade).
const MAIS_ATIVIDADE = 15;
const atividade = { mostrar: 12, antigas: [], fim: false, carregando: false };

function todasAsAtividades() {
  const doServidor = [...estado.recentes, ...atividade.antigas];
  const vistos = new Set();
  const unicas = doServidor.filter(i => {
    const chave = `${i.tipo}|${i.contato_id}|${i.quando}|${i.para || ''}|${i.texto || ''}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
  // As chegadas vêm dos contatos já carregados; enquanto o servidor tiver mais, só até a movimentação mais antiga
  // que já chegou, para a lista não pular nada.
  const maisAntiga = !atividade.fim && unicas.length ? unicas.map(i => String(i.quando)).sort()[0] : '';
  const chegadas = estado.contatos
    .filter(c => String(c.criado_em) >= maisAntiga)
    .map(c => ({ tipo: 'chegada', quando: c.criado_em, contato_id: c.id, contato: c.nome, servico: c.servico, origem: c.origem, criado_por: c.criado_por }));
  return [...unicas, ...chegadas].sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
}

async function verMais(caixa) {
  if (atividade.carregando) return;
  atividade.mostrar += MAIS_ATIVIDADE;
  if (!atividade.fim && atividade.mostrar > todasAsAtividades().length) {
    atividade.carregando = true;
    try {
      const { itens, temMais } = await api(`/api/atividade?a_partir=${estado.recentes.length + atividade.antigas.length}`);
      atividade.antigas.push(...itens);
      atividade.fim = !temMais;
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    } finally {
      atividade.carregando = false;
    }
  }
  caixa.replaceWith(feedAtividade());
}

function feedAtividade() {
  const todas = todasAsAtividades();
  const itens = todas.slice(0, atividade.mostrar);
  if (!itens.length) return el('p', 'vazio-mini', 'Nada aconteceu ainda. Os contatos do site aparecem aqui assim que chegarem.');

  const lista = el('ol', 'atividade', itens.map(item => {
    const nomeContato = el('button', 'link-contato', item.contato);
    nomeContato.type = 'button';
    nomeContato.addEventListener('click', () => acoes.abrirFicha(item.contato_id));
    let frase;
    let iconeItem = 'sistema';
    if (item.tipo === 'chegada') {
      iconeItem = 'chegada';
      const autor = item.criado_por ? estado.usuarios.find(u => u.id === item.criado_por)?.nome : null;
      frase = autor
        ? [`${primeiroNome(autor)} cadastrou `, nomeContato, ` (${SERVICOS[item.servico]?.nome})`]
        : [nomeContato, ` chegou pelo site (${SERVICOS[item.servico]?.nome})`];
    } else if (item.tipo === 'etapa') {
      iconeItem = 'etapa';
      frase = [`${primeiroNome(item.usuario) || 'Alguém'} moveu `, nomeContato, ` para ${item.para ? NOME_ETAPA[item.para] : CAIXA}`];
    } else if (item.tipo === 'nota') {
      iconeItem = 'nota';
      frase = [`${primeiroNome(item.usuario) || 'Alguém'} anotou em `, nomeContato, el('q', '', resumir(item.texto, 80))];
    } else {
      frase = [`${primeiroNome(item.usuario) || 'Alguém'} ${item.texto} · `, nomeContato];
    }
    return el('li', '', el('span', `atividade-icone atividade-icone--${item.tipo}`, icone(iconeItem)),
      el('div', '', el('p', '', frase), el('time', '', relativo(item.quando))));
  }));
  const haMais = todas.length > itens.length || !atividade.fim;
  const caixa = el('div', 'atividade-caixa', lista);
  if (haMais) {
    const mais = botao('Ver mais', 'botao--fantasma botao--pequeno atividade-mais', () => verMais(caixa), { icone: 'mais', titulo: 'Mostrar atividades mais antigas' });
    caixa.append(mais);
  } else if (itens.length > 12) {
    caixa.append(el('p', 'atividade-fim', 'Essa é toda a atividade registrada.'));
  }
  return caixa;
}

function resumir(texto, maximo) {
  const t = String(texto || '').replace(/\s+/g, ' ');
  return t.length > maximo ? `${t.slice(0, maximo - 1)}…` : t;
}

function juntar(itens) {
  return maiuscula(itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : itens[0]);
}

function maiuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export { calcularPendencias };
