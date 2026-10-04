// Andamento: quadro com uma coluna por etapa. Cartões vão por arrastar ou pelas setas.
import { estado, acoes, ativos, usuarioPorId } from './estado.js';
import { listaSuspensa, campoFiltro } from './entrada.js';
import {
  el, botao, icone, avatar, ETAPAS, CAIXA, SERVICOS, reais, reaisCurto, situacaoPrazo,
  normalizar, textoBusca, relativo,
} from './util.js';

const filtro = { servico: '', responsavel: '', texto: '' };

export function desenharQuadro(raiz) {
  const redesenhar = () => desenharQuadro(raiz);
  const cabecalho = el('header', 'tela-topo',
    el('div', '', el('h1', '', 'Andamento')));

  const quadro = el('div', 'quadro');
  const pintar = () => quadro.replaceChildren(...colunas());

  // Responsável: atalhos e, abaixo, cada pessoa da equipe (sem encher a tela de nomes).
  const pessoas = estado.usuarios.filter(u => u.id !== estado.usuario.id).map(u => [String(u.id), u.nome]);
  const ferramentas = el('div', 'ferramentas',
    listaSuspensa('Serviço', [['', 'Todos os serviços'], ['calculos', 'Cálculos'], ['automacao', 'Automação']], filtro.servico,
      valor => { filtro.servico = valor; redesenhar(); }),
    listaSuspensa('Responsável', [['', 'Toda a equipe'], ['eu', 'Comigo'], ['ninguem', 'Sem responsável'], ...pessoas], filtro.responsavel,
      valor => { filtro.responsavel = valor; redesenhar(); }),
    campoFiltro(filtro.texto, texto => { filtro.texto = texto; pintar(); }));

  pintar();
  raiz.replaceChildren(cabecalho, ferramentas, quadro);
}

function filtrados() {
  const busca = normalizar(filtro.texto);
  return ativos().filter(c => c.etapa &&
    (!filtro.servico || c.servico === filtro.servico) &&
    (!filtro.responsavel || (filtro.responsavel === 'eu' ? c.responsavel_id === estado.usuario.id
      : filtro.responsavel === 'ninguem' ? !c.responsavel_id : c.responsavel_id === Number(filtro.responsavel))) &&
    (!busca || textoBusca(c).includes(busca)));
}

// Quatro colunas: Notas e ordens, Pedido, Revisão e Conclusão (o que o funcionário entregou e o
// administrador ainda vai concluir de verdade). O concluído vai para Concluídos.
const ETAPAS_QUADRO = ETAPAS.filter(([chave]) => chave !== 'concluido').map(([chave, nome]) => [chave, chave === 'entregue' ? 'Conclusão' : nome]);
// Setas de cada etapa: Pedido entrega direto para a Conclusão; a Retificação só nasce da reprovação.
const ANTERIOR = { nota_emitida: [null, 'Caixa de entrada'], pedido: ['nota_emitida', 'Notas e ordens'], revisado: ['entregue', 'Conclusão'], entregue: ['pedido', 'Pedido'] };
const PROXIMA = { nota_emitida: ['pedido', 'Pedido'], pedido: ['entregue', 'Conclusão'], revisado: ['entregue', 'Conclusão'] };

function colunas() {
  const contatos = filtrados();
  return ETAPAS_QUADRO.map(([chave, nome], indice) => {
    const daEtapa = contatos.filter(c => c.etapa === chave);
    // Prazo mais próximo primeiro; sem prazo, o mais recente na etapa.
    daEtapa.sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999') || String(b.atualizado_em).localeCompare(String(a.atualizado_em)));

    const soma = daEtapa.reduce((s, c) => s + (c.valor_centavos || 0), 0);
    const coluna = el('section', `coluna coluna--${chave}`);
    coluna.dataset.etapa = chave;
    coluna.setAttribute('aria-label', nome);
    coluna.append(el('header', 'coluna-topo',
      el('span', 'coluna-nome', el('span', 'coluna-passo', String(indice + 1)), nome),
      el('span', 'coluna-info', el('b', '', String(daEtapa.length)), soma ? el('small', '', reaisCurto(soma)) : null)));

    const cartoes = el('div', 'coluna-cartoes');
    if (!daEtapa.length) cartoes.append(el('p', 'coluna-vazia', 'Arraste um cartão para cá.'));
    for (const c of daEtapa) cartoes.append(cartao(c, indice));
    coluna.append(cartoes);
    prepararSoltar(coluna);
    return coluna;
  });
}

function cartao(c, indice) {
  const artigo = el('article', `cartao cartao--${c.servico}${c.lido_em ? '' : ' is-novo'}`);
  artigo.draggable = true;
  artigo.tabIndex = 0;
  artigo.dataset.id = c.id;
  artigo.setAttribute('aria-label', `${c.nome}, abrir ficha`);
  artigo.addEventListener('dragstart', evento => {
    evento.dataTransfer.setData('text/plain', String(c.id));
    evento.dataTransfer.effectAllowed = 'move';
    artigo.classList.add('is-arrastando');
  });
  artigo.addEventListener('dragend', () => artigo.classList.remove('is-arrastando'));
  artigo.addEventListener('click', evento => {
    if (!evento.target.closest('button')) acoes.abrirFicha(c.id);
  });
  artigo.addEventListener('keydown', evento => {
    if (evento.target !== artigo) return;
    if (evento.key === 'Enter') acoes.abrirFicha(c.id);
    if (evento.key === 'ArrowRight' && PROXIMA[c.etapa]) acoes.mover(c.id, PROXIMA[c.etapa][0]);
    if (evento.key === 'ArrowLeft' && ANTERIOR[c.etapa]) acoes.mover(c.id, ANTERIOR[c.etapa][0]);
  });

  const prazo = c.etapa !== 'entregue' ? situacaoPrazo(c.prazo) : null;
  const naConclusao = c.etapa === 'entregue';
  const responsavel = usuarioPorId(c.responsavel_id);
  const temValor = c.valor_centavos !== null && c.valor_centavos !== undefined;
  const valor = temValor
    ? el('span', `cartao-valor${c.pago_em ? ' is-pago' : ''}`, c.pago_em ? icone('ok') : null, reais(c.valor_centavos))
    : null;
  if (valor && c.pago_em) valor.title = 'Pago';

  const anterior = ANTERIOR[c.etapa] || null;
  const proxima = PROXIMA[c.etapa] || null;
  const concluir = c.etapa === 'entregue';
  // Três linhas curtas: nome e valor · serviço, nota e prazo · responsável, contadores e setas.
  artigo.append(...[
    el('div', 'cartao-linha1', el('strong', 'cartao-nome', c.nome), valor),
    el('div', 'cartao-meta',
      el('span', `servico-mini servico-mini--${c.servico}`, SERVICOS[c.servico]?.nome || c.servico),
      c.nota_fiscal ? el('span', 'cartao-nf', `NF ${c.nota_fiscal}`) : null,
      prazo ? el('span', `chip-prazo chip-prazo--${prazo.classe}`, icone(prazo.classe === 'critico' ? 'alerta' : 'relogio'), prazo.texto) : null,
      // Em Pedido, o administrador vê se o funcionário já iniciou; na Retificação, quantas vezes voltou.
      c.etapa === 'pedido' ? el('span', `cartao-estado${c.iniciado_em ? ' is-iniciado' : ''}`, c.iniciado_em ? 'Iniciado' : 'A iniciar') : null,
      c.etapa === 'revisado' ? el('span', 'cartao-estado is-retificacao', `Retificação ${c.retificacoes > 1 ? `${c.retificacoes}ª` : ''}`.trim()) : null),
    el('div', 'cartao-rodape',
      responsavel ? avatar(responsavel.nome, 'avatar--pequeno') : el('span', 'sem-responsavel', icone('usuario'), el('span', 'sr', 'Sem responsável')),
      c.total_notas ? el('span', 'cartao-notas', icone('nota'), String(c.total_notas)) : null,
      c.total_arquivos ? el('span', 'cartao-notas', icone('anexo'), String(c.total_arquivos)) : null,
      el('time', 'cartao-tempo', c.atualizado_em ? relativo(c.atualizado_em) : ''),
      el('span', 'cartao-setas',
        anterior ? botao('', 'botao--icone botao--fantasma botao--pequeno', () => acoes.mover(c.id, anterior[0]), { icone: 'seta_esq', titulo: `Voltar para ${anterior[1]}` }) : null,
        concluir ? botao('', 'botao--icone botao--fantasma botao--pequeno botao--recusar', () => acoes.reprovar(c.id), { icone: 'recusar', titulo: 'Reprovar: volta ao responsável, em Retificação' }) : null,
        concluir
          ? botao('Aprovar', 'botao--primario botao--pequeno', () => acoes.mover(c.id, 'concluido'), { icone: 'ok', titulo: naConclusao ? 'O cliente aprovou: vai para Concluídos' : 'Concluir a demanda' })
          : proxima ? botao('', 'botao--icone botao--primario botao--pequeno', () => acoes.mover(c.id, proxima[0]), { icone: 'seta_dir', titulo: `Avançar para ${proxima[1]}` }) : null)),
  ].filter(Boolean));
  return artigo;
}

function prepararSoltar(coluna) {
  coluna.addEventListener('dragover', evento => {
    evento.preventDefault();
    evento.dataTransfer.dropEffect = 'move';
    coluna.classList.add('is-alvo');
  });
  coluna.addEventListener('dragleave', evento => {
    if (!coluna.contains(evento.relatedTarget)) coluna.classList.remove('is-alvo');
  });
  coluna.addEventListener('drop', evento => {
    evento.preventDefault();
    coluna.classList.remove('is-alvo');
    const id = Number(evento.dataTransfer.getData('text/plain'));
    if (id) acoes.mover(id, coluna.dataset.etapa);
  });
}
