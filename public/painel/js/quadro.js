// Andamento: quadro com uma coluna por etapa. Cartões vão por arrastar ou pelas setas.
import { estado, acoes, ativos, usuarioPorId } from './estado.js';
import { listaSuspensa, campoFiltro } from './entrada.js';
import {
  el, botao, icone, avatar, etiquetaServico, ETAPAS, CAIXA, reais, reaisCurto, situacaoPrazo,
  normalizar, textoBusca, diaDe, hoje, diasEntre, relativo,
} from './util.js';

const filtro = { servico: '', responsavel: '', texto: '', entreguesTodos: false };

export function desenharQuadro(raiz) {
  const redesenhar = () => desenharQuadro(raiz);
  const cabecalho = el('header', 'tela-topo',
    el('div', '',
      el('h1', '', 'Andamento'),
      el('p', '', 'Arraste os cartões entre as etapas ou use as setas. Clique num cartão para abrir a ficha.')));

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

function colunas() {
  const contatos = filtrados();
  const dia = hoje();
  return ETAPAS.map(([chave, nome], indice) => {
    let daEtapa = contatos.filter(c => c.etapa === chave);
    // Prazo mais próximo primeiro; sem prazo, o mais recente na etapa.
    daEtapa.sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999') || String(b.atualizado_em).localeCompare(String(a.atualizado_em)));

    // Entregues antigos não lotam a coluna: mostra os últimos 30 dias, com opção de ver todos.
    let ocultos = 0;
    if (chave === 'entregue' && !filtro.entreguesTodos) {
      const recentes = daEtapa.filter(c => !c.atualizado_em || diasEntre(diaDe(c.atualizado_em), dia) <= 30);
      ocultos = daEtapa.length - recentes.length;
      daEtapa = recentes;
    }

    const soma = daEtapa.reduce((s, c) => s + (c.valor_centavos || 0), 0);
    const coluna = el('section', `coluna coluna--${chave}`);
    coluna.dataset.etapa = chave;
    coluna.setAttribute('aria-label', nome);
    coluna.append(el('header', 'coluna-topo',
      el('span', 'coluna-nome', el('span', 'coluna-passo', String(indice + 1)), nome),
      el('span', 'coluna-info', el('b', '', String(daEtapa.length + ocultos)), soma ? el('small', '', reaisCurto(soma)) : null)));

    const cartoes = el('div', 'coluna-cartoes');
    if (!daEtapa.length) cartoes.append(el('p', 'coluna-vazia', 'Arraste um cartão para cá.'));
    for (const c of daEtapa) cartoes.append(cartao(c, indice));
    if (ocultos) {
      cartoes.append(botao(`Ver mais ${ocultos} entregues há mais de 30 dias`, 'botao--fantasma botao--pequeno', () => {
        filtro.entreguesTodos = true;
        acoes.navegar('andamento');
      }));
    }
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
    if (evento.key === 'ArrowRight' && ETAPAS[indice + 1]) acoes.mover(c.id, ETAPAS[indice + 1][0]);
    if (evento.key === 'ArrowLeft') acoes.mover(c.id, indice > 0 ? ETAPAS[indice - 1][0] : null);
  });

  const prazo = c.etapa !== 'entregue' ? situacaoPrazo(c.prazo) : null;
  const responsavel = usuarioPorId(c.responsavel_id);
  const detalhes = [];
  if (c.valor_centavos !== null && c.valor_centavos !== undefined) detalhes.push(el('span', `cartao-valor${c.pago_em ? ' is-pago' : ''}`, reais(c.valor_centavos), c.pago_em ? el('small', '', ' pago') : null));
  if (c.nota_fiscal) detalhes.push(el('span', 'cartao-nf', `NF ${c.nota_fiscal}`));

  const anterior = indice > 0 ? ETAPAS[indice - 1] : null;
  const proxima = ETAPAS[indice + 1];
  artigo.append(...[
    el('div', 'cartao-topo', etiquetaServico(c.servico), prazo ? el('span', `chip-prazo chip-prazo--${prazo.classe}`, icone(prazo.classe === 'critico' ? 'alerta' : 'relogio'), prazo.texto) : null),
    el('strong', 'cartao-nome', c.nome),
    detalhes.length ? el('div', 'cartao-detalhes', detalhes) : null,
    el('div', 'cartao-rodape',
      responsavel ? avatar(responsavel.nome, 'avatar--pequeno') : el('span', 'sem-responsavel', icone('usuario'), el('span', 'sr', 'Sem responsável')),
      c.total_notas ? el('span', 'cartao-notas', icone('nota'), String(c.total_notas)) : null,
      c.total_arquivos ? el('span', 'cartao-notas', icone('anexo'), String(c.total_arquivos)) : null,
      el('time', 'cartao-tempo', c.atualizado_em ? relativo(c.atualizado_em) : ''),
      el('span', 'cartao-setas',
        botao('', 'botao--icone botao--fantasma botao--pequeno', () => acoes.mover(c.id, anterior ? anterior[0] : null), { icone: 'seta_esq', titulo: `Voltar para ${anterior ? anterior[1] : CAIXA}` }),
        proxima ? botao('', 'botao--icone botao--primario botao--pequeno', () => acoes.mover(c.id, proxima[0]), { icone: 'seta_dir', titulo: `Avançar para ${proxima[1]}` }) : null)),
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
