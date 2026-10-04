// Ficha do contato. Pedido novo (ou recusado): contato, solicitação e comentários, com Aceitar e Recusar.
// Depois de aceito, uma aba por etapa do andamento:
//   1. Notas e ordens (só administrador): contato, valores, pagamento, notas fiscais e ordens de serviço.
//   2. Pedido: responsável e prazo, a solicitação (com os documentos do cliente) e anotações.
//   3. Retificação (só se o administrador reprovar a entrega): o que ajustar e a nova versão.
//   4. Entregue: arquivos finais, molde do relatório, comentário e o registro do dia da entrega; o
//      administrador aprova (Concluído) ou reprova (volta para Retificação).
// Clicar numa aba só mostra o conteúdo; mudar de etapa é pelo botão de ação, com confirmação.
import { estado, acoes, contatoPorId, usuarioPorId, eAdmin } from './estado.js';
import { api } from './api.js';
import { etiquetasDaDemanda } from './etiquetas.js';
import { gerarOS } from './os.js';
import { MOMENTOS, linkWhatsAppMensagem, linkEmailMensagem } from './mensagens.js';
import { criarZip } from './zip.js';
import {
  el, botao, link, icone, avatar, etiquetaServico, NOME_ETAPA, CAIXA, SERVICOS, ORIGENS, ETAPAS,
  dataHora, relativo, reais, lerReais, centavosParaCampo, situacaoPrazo, diaBr, tamanhoArquivo,
  hoje, tipoArquivo, diaDe, fechada,
} from './util.js';

// O funcionário vê e envia só documentos do cliente e arquivos da entrega.
const CATEGORIAS_FUNCIONARIO = ['cliente', 'entrega'];
// Etapas em que o funcionário trabalha. Notas e ordens é do administrador.
const ETAPAS_FUNCIONARIO = ['pedido', 'revisado', 'entregue'];

const ABAS = [
  { chave: 'nota_emitida', nome: 'Notas e ordens', etapas: ['nota_emitida'], admin: true },
  { chave: 'pedido', nome: 'Pedido', etapas: ['pedido', 'processo_iniciado'] },
  { chave: 'revisado', nome: 'Retificação', etapas: ['revisado'], opcional: true },
  { chave: 'entregue', nome: 'Entregue', etapas: ['entregue', 'concluido'] },
];
// Pedido novo ou recusado ainda não tem etapa: a ficha mostra a "entrada" (fora da trilha).
const ABA_ENTRADA = { chave: 'entrada', nome: 'Pedido recebido' };
const abaDaEtapa = etapa => (etapa ? (ABAS.find(a => a.etapas.includes(etapa)) || ABAS[0]).chave : 'entrada');
const indiceAba = chave => ABAS.findIndex(a => a.chave === chave);
const abaPorChave = chave => ABAS.find(a => a.chave === chave) || ABA_ENTRADA;

const janela = () => document.querySelector('#ficha');
let atualId = null;
let abaAberta = 'entrada';
let editandoDados = false;
let dados = { itens: [], arquivos: [], carregado: false };
let sequencia = 0;

// Para o funcionário, a demanda concluída fica só para consulta.
const somenteLeitura = c => !eAdmin() && fechada(c.etapa);
// O funcionário leva a demanda entre Pedido, Revisão e Entregue.
const podeMoverPara = (c, etapa) => eAdmin() || (ETAPAS_FUNCIONARIO.includes(etapa) && !somenteLeitura(c));
const podeVerAba = aba => !aba.admin || eAdmin();

export const fichaAberta = () => (janela().open ? atualId : null);

export function abrirFicha(id, abaInicial = null) {
  const contato = contatoPorId(id);
  if (!contato) {
    acoes.avisar('Esse contato não existe mais.', 'erro');
    return;
  }
  atualId = id;
  editandoDados = false;
  dados = { itens: [], arquivos: [], carregado: false };
  const chave = abaInicial || abaDaEtapa(contato.etapa);
  const aba = ABAS.find(a => a.chave === chave);
  abaAberta = chave === 'entrada' ? 'entrada' : aba && podeVerAba(aba) ? aba.chave : abaDaEtapa(contato.etapa);
  desenhar();
  if (!janela().open) janela().showModal();
  janela().querySelector('.ficha-corpo').scrollTop = 0;
  carregar();
  if (!contato.lido_em) acoes.alterar(id, { lido: true }, null);
}

// Chamado depois de cada recarga da Central, com a ficha aberta.
export function atualizarFicha() {
  if (!fichaAberta()) return;
  if (!contatoPorId(atualId)) { janela().close(); return; }
  // Não atrapalha quem está digitando.
  if (janela().contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
  const rolagem = janela().querySelector('.ficha-corpo')?.scrollTop || 0;
  desenhar();
  janela().querySelector('.ficha-corpo').scrollTop = rolagem;
  carregar();
}

// Linha do tempo e arquivos de uma vez; depois preenche as listas sem redesenhar os campos.
async function carregar() {
  const id = atualId;
  try {
    const [{ itens }, { arquivos }] = await Promise.all([
      api(`/api/contatos/${id}/linha-do-tempo`),
      api(`/api/contatos/${id}/arquivos`),
    ]);
    if (id !== atualId) return;
    dados = { itens, arquivos, carregado: true };
    preencher();
  } catch (e) {
    if (id === atualId) for (const lista of janela().querySelectorAll('[data-lista]')) lista.replaceChildren(el('li', 'aviso', e.message));
  }
}

async function depoisDeMudar() {
  await carregar();
  acoes.recarregar({ silencioso: true });
}

// ---------- Estrutura ----------

function desenhar() {
  const c = contatoPorId(atualId);
  const fechar = botao('', 'botao--icone botao--fantasma', () => janela().close(), { icone: 'fechar', titulo: 'Fechar ficha' });
  const origem = [ORIGENS[c.origem] || c.origem, c.chamada].filter(Boolean).join(' · ');
  const cabecalho = el('header', 'ficha-topo',
    avatar(c.nome, 'avatar--grande'),
    el('div', 'ficha-titulo',
      el('h2', '', c.nome),
      el('p', '', c.protocolo ? el('span', 'etiqueta-protocolo', c.protocolo) : null, etiquetaServico(c.servico), el('span', '', origem), el('span', '', `chegou ${relativo(c.criado_em)}`, el('span', 'sr', ` (${dataHora(c.criado_em)})`))),
      etiquetasDaDemanda(c)),
    fechar);

  const painel = el('div', 'ficha-painel');
  painel.setAttribute('role', 'tabpanel');
  painel.id = 'ficha-painel';
  const corpo = el('div', 'ficha-corpo',
    somenteLeitura(c) ? avisoConcluida(c) : null,
    andamento(c),
    acoesRapidas(c),
    painel,
    historicoCompleto());
  janela().className = `ficha ficha--${c.servico}`;
  janela().replaceChildren(cabecalho, corpo);
  desenharPainel();
}

function avisoConcluida(c) {
  const quem = usuarioPorId(c.responsavel_id);
  return el('p', 'aviso-concluida', icone('ok'),
    el('span', '', el('strong', '', 'Demanda concluída'), ` em ${dataHora(c.atualizado_em)}${quem ? ` · ${quem.nome}` : ''}. Fica aqui só para consulta; para reabrir, fale com um administrador.`));
}

// Trilha de etapas, que também são as abas da ficha, e o botão que move para a próxima etapa.
function andamento(c) {
  const atual = indiceAba(abaDaEtapa(c.etapa));
  const trilha = el('ol', 'trilha');
  trilha.setAttribute('role', 'tablist');
  ABAS.forEach((aba, i) => {
    const bloqueada = !podeVerAba(aba);
    // Retificação só existe se o administrador reprovou a entrega alguma vez.
    const travada = aba.opcional && c.etapa !== 'revisado' && !c.retificacoes;
    const situacao = travada ? 'futuro' : i < atual ? 'feito' : i === atual ? 'atual' : 'futuro';
    const ponto = bloqueada ? icone('cadeado') : situacao === 'feito' ? icone('ok') : String(i + 1);
    const b = el('button', `trilha-passo trilha-passo--${situacao}${bloqueada ? ' is-bloqueado' : ''}${travada ? ' is-travado' : ''}${aba.chave === abaAberta ? ' is-aberta' : ''}`,
      el('span', 'trilha-ponto', ponto), el('span', 'trilha-nome', aba.nome));
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(aba.chave === abaAberta));
    b.setAttribute('aria-controls', 'ficha-painel');
    if (i === atual) b.setAttribute('aria-current', 'step');
    if (bloqueada || travada) {
      b.disabled = true;
      b.title = bloqueada ? 'Só administradores: tem os valores e pagamentos' : 'Só é usada se o administrador reprovar a entrega e pedir ajuste';
    } else {
      b.title = `Ver ${aba.nome}${i === atual ? ' (etapa atual)' : ''}`;
      b.addEventListener('click', () => {
        abaAberta = aba.chave;
        for (const outro of trilha.querySelectorAll('.trilha-passo')) {
          const aberto = outro === b;
          outro.classList.toggle('is-aberta', aberto);
          outro.setAttribute('aria-selected', String(aberto));
        }
        desenharPainel();
      });
    }
    trilha.append(el('li', '', b));
  });
  return el('section', 'ficha-etapas', el('div', 'ficha-etapas-topo', el('h3', '', 'Andamento'), acaoPrincipal(c)), trilha);
}

// Administrador: além de avançar, pode voltar uma etapa de cada vez, inclusive reabrir uma entregue.
function acaoPrincipal(c) {
  if (!c.etapa) {
    if (!eAdmin()) return null;
    const aceitar = botao('Aceitar pedido', 'botao--primario botao--pequeno', () => acoes.mover(c.id, 'nota_emitida'), { icone: 'ok', titulo: 'Vai para o Andamento, em Notas e ordens' });
    const outra = c.recusado_em
      ? botao('Devolver para a caixa de entrada', 'botao--fantasma botao--pequeno', () => acoes.alterar(c.id, { recusado: false }, `${c.nome} voltou para a caixa de entrada.`), { icone: 'restaurar' })
      : botao('Recusar', 'botao--fantasma botao--pequeno botao--recusar', () => acoes.recusar(c.id), { icone: 'recusar', titulo: 'O pedido fica guardado em Recusados' });
    return el('div', 'acoes-etapa', outra, aceitar);
  }
  if (!eAdmin()) return acaoAvancar(c);
  const [anterior, nomeAnterior] = VOLTAR[c.etapa] || [null, CAIXA];
  const voltar = c.etapa === 'concluido'
    ? botao('Reabrir: voltar para a Conclusão', 'botao--fantasma botao--pequeno', () => acoes.mover(c.id, anterior), { icone: 'restaurar', titulo: 'Tira a demanda de Concluídos e devolve ao Andamento' })
    : botao(`Voltar para ${nomeAnterior}`, 'botao--fantasma botao--pequeno', () => acoes.mover(c.id, anterior), { icone: 'seta_esq' });
  return el('div', 'acoes-etapa', voltar, acaoAvancar(c));
}

// Para onde o administrador volta a demanda, de cada etapa.
const VOLTAR = {
  nota_emitida: [null, CAIXA],
  pedido: ['nota_emitida', 'Notas e ordens'],
  revisado: ['entregue', 'Conclusão'],
  entregue: ['pedido', 'Pedido'],
  concluido: ['entregue', 'Conclusão'],
};

function acaoAvancar(c) {
  const admin = eAdmin();
  if (c.etapa === 'concluido') return el('span', 'concluido', icone('ok'), 'Concluída');
  if (c.etapa === 'entregue') {
    // Volta para o administrador falar com o cliente: aprova (concluída) ou reprova (retificação).
    if (!admin) return el('span', 'concluido', icone('ok'), 'Entregue');
    return el('span', 'acoes-etapa',
      botao('Reprovar', 'botao--fantasma botao--pequeno botao--recusar', () => acoes.reprovar(c.id), { icone: 'recusar', titulo: 'O cliente pediu ajuste: volta ao responsável, em Retificação' }),
      botao('Aprovar e concluir', 'botao--primario botao--pequeno', () => acoes.mover(c.id, 'concluido'), { icone: 'ok', titulo: 'O cliente aprovou: vai para Concluídos' }));
  }
  if (c.etapa === 'nota_emitida') {
    return botao('Passar para Pedido', 'botao--primario botao--pequeno', () => acoes.mover(c.id, 'pedido'), { icone: 'seta_dir', titulo: 'Escolha quem da equipe vai cuidar' });
  }
  // Pedido: primeiro "Iniciar pedido" (para o funcionário saber onde está), depois "Entregar".
  if (c.etapa === 'pedido' && !c.iniciado_em) {
    return botao('Iniciar pedido', 'botao--primario botao--pequeno', () => acoes.iniciar(c.id), { icone: 'seta_dir', titulo: 'Avise que começou a trabalhar nesta demanda' });
  }
  if (c.etapa === 'pedido') return botao('Entregar', 'botao--primario botao--pequeno', () => { abrirAba('entregue'); }, { icone: 'ok', titulo: 'Abre a aba Entregue para enviar os arquivos finais e entregar' });
  if (c.etapa === 'revisado') return botao('Entregar nova versão', 'botao--primario botao--pequeno', () => { abrirAba('revisado'); }, { icone: 'ok', titulo: 'Abre a Retificação para enviar a nova versão e entregar de novo' });
  return null;
}

function abrirAba(chave) {
  abaAberta = chave;
  for (const b of janela().querySelectorAll('.trilha-passo')) {
    const aberta = b.querySelector('.trilha-nome').textContent === abaPorChave(chave).nome;
    b.classList.toggle('is-aberta', aberta);
    b.setAttribute('aria-selected', String(aberta));
  }
  desenharPainel();
  janela().querySelector('.ficha-painel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Painel de cada aba ----------

function desenharPainel() {
  const c = contatoPorId(atualId);
  const painel = janela().querySelector('.ficha-painel');
  if (!c || !painel) return;
  const aba = abaPorChave(abaAberta);
  const conteudo = {
    entrada: painelEntrada,
    nota_emitida: painelNotas,
    pedido: painelPedido,
    revisado: painelRevisado,
    entregue: painelEntregue,
  }[aba.chave](c);
  // O replaceChildren do navegador escreve "null" para um vazio: só entra o que existe.
  painel.replaceChildren(...[topoDoPainel(c, aba), ...conteudo, rodapeDoPainel(c, aba)].filter(Boolean));
  atualizarMensagens(c);
  preencher();
}

function topoDoPainel(c, aba) {
  if (aba.chave === 'entrada') {
    const estadoEntrada = !c.etapa ? (c.recusado_em ? ['futuro', `Recusado ${relativo(c.recusado_em)}`] : ['atual', 'Aguardando aceite']) : ['feito', 'Aceito'];
    return el('div', 'painel-topo', el('h3', '', aba.nome), el('span', `estado-aba estado-aba--${estadoEntrada[0]}`, estadoEntrada[1]));
  }
  const atual = indiceAba(abaDaEtapa(c.etapa));
  const i = indiceAba(aba.chave);
  const situacao = i < atual ? ['feito', 'Etapa concluída'] : i === atual ? ['atual', 'Etapa atual'] : ['futuro', 'Ainda não chegou aqui'];
  return el('div', 'painel-topo', el('h3', '', aba.nome), el('span', `estado-aba estado-aba--${situacao[0]}`, situacao[1]));
}

// Em outra aba que não a atual: atalho para mover para ela (com confirmação).
function rodapeDoPainel(c, aba) {
  if (abaDaEtapa(c.etapa) === aba.chave || aba.chave === 'entrada' || !c.etapa) return null;
  const destino = aba.chave;
  if (!podeMoverPara(c, destino) || destino === 'entregue' || destino === 'revisado') return null;
  return el('div', 'painel-rodape', botao(`Mover a demanda para ${aba.nome}`, 'botao--fantasma botao--pequeno', () => acoes.mover(c.id, destino), { icone: 'etapa' }));
}

// Pedido novo ou recusado: quem é, o que pediu e comentários. Aceitar e Recusar ficam no topo.
function painelEntrada(c) {
  return [
    blocoContato(c),
    blocoSolicitacao(c),
    comentarios(c, 'entrada', 'Comentários', 'Anotar algo sobre este contato…'),
  ];
}

// 1. Notas e ordens: o administrador cobra, emite a nota e colhe a assinatura (Gerar OS fica no topo da ficha).
function painelNotas(c) {
  return [
    el('div', 'ficha-grade ficha-grade--3',
      el('div', 'ficha-coluna', blocoContato(c)),
      el('div', 'ficha-coluna', blocoNegocio(c), blocoPrazo(c)),
      el('div', 'ficha-coluna', blocoArquivos(c, ['nota', 'ordem', 'outro'], { titulo: 'Notas e ordens de serviço', icone: 'anexo', envio: 'outro' }))),
    comentarios(c, 'nota_emitida', 'Comentários internos', 'Só administradores veem estes comentários…'),
  ];
}

// 2. Pedido: responsável e prazo, a solicitação com os documentos do cliente e as anotações do trabalho.
// O contato do cliente só aparece para o administrador.
function painelPedido(c) {
  return [
    eAdmin()
      ? el('div', 'ficha-grade', el('div', 'ficha-coluna', blocoEntrega(c)), el('div', 'ficha-coluna', blocoContato(c)))
      : blocoEntrega(c),
    blocoSolicitacao(c, { comEnvio: true }),
    comentarios(c, ['processo_iniciado', 'entrada'], 'Anotações do pedido', 'Ex.: conferi os holerites, falta o índice de março…'),
  ];
}

function painelRevisado(c) {
  const partes = [
    comentarios(c, 'revisado', 'O que o cliente pediu para ajustar', 'Ex.: incluir as horas extras de março e refazer o relatório…', { destaque: true }),
    blocoArquivos(c, ['entrega'], { titulo: 'Nova versão', icone: 'documento', envio: 'entrega' }),
  ];
  if (c.etapa === 'revisado' && podeMoverPara(c, 'entregue')) {
    partes.push(el('div', 'painel-rodape painel-rodape--destaque',
      botao('Entregar nova versão', 'botao--primario', () => concluir(c), { icone: 'ok', titulo: 'Volta para o administrador aprovar com o cliente' })));
  }
  return partes;
}

// Prazo de entrega (administrador, em Notas e ordens). Ao aceitar, já vem 3 dias úteis (cálculo) ou 5 (automação).
function blocoPrazo(c) {
  const salvo = indicadorSalvo();
  const salvar = salvarCampos(c, salvo);
  const prazo = !fechada(c.etapa) ? situacaoPrazo(c.prazo) : null;
  return el('section', 'bloco',
    el('div', 'bloco-topo', el('h3', 'titulo-icone', icone('agenda'), 'Prazo de entrega'), salvo),
    el('label', 'campo', el('span', '', 'Entregar até', prazo ? el('span', `chip-prazo chip-prazo--${prazo.classe}`, prazo.texto) : null),
      campoData(c.prazo, valor => salvar({ prazo: valor }), { comHoje: false })));
}

function painelEntregue(c) {
  const entregue = fechada(c.etapa);
  const registro = entregue ? ultimaEntrega() : null;
  const partes = [];
  if (entregue) partes.push(registroDaEntrega(c, registro));
  if (entregue && eAdmin()) partes.push(blocoEnvioCliente(c));
  partes.push(
    el('div', 'ficha-grade',
      el('div', 'ficha-coluna', blocoArquivos(c, ['entrega'], { titulo: 'Arquivos da entrega', icone: 'documento', envio: 'entrega', aoEnviar: entregue ? null : () => perguntarSeConclui(c) })),
      el('div', 'ficha-coluna', blocoMoldes(['relatorio']))),
    comentarios(c, 'entregue', 'Comentário da entrega', 'Ex.: entregue por e-mail ao cliente, com o vídeo explicativo…'));
  if (c.etapa === 'pedido' && podeMoverPara(c, 'entregue')) {
    partes.push(el('div', 'painel-rodape painel-rodape--destaque',
      !c.iniciado_em && !eAdmin()
        ? botao('Iniciar pedido primeiro', 'botao--primario', () => acoes.iniciar(c.id), { icone: 'seta_dir' })
        : botao('Entregar e registrar entrega', 'botao--primario', () => concluir(c), { icone: 'ok' })));
  }
  // Na Conclusão, o administrador finaliza com o cliente (ou volta as etapas e realoca).
  if (c.etapa === 'entregue' && eAdmin()) {
    partes.push(el('div', 'painel-rodape painel-rodape--destaque',
      botao('Reprovar e pedir ajuste', 'botao--fantasma botao--recusar', () => acoes.reprovar(c.id), { icone: 'recusar', titulo: 'Volta ao responsável, em Retificação' }),
      botao('Aprovar e concluir', 'botao--primario', () => acoes.mover(c.id, 'concluido'), { icone: 'ok', titulo: 'O cliente aprovou: vai para Concluídos' })));
  }
  return partes;
}

// Mensagem dos botões de WhatsApp e e-mail conforme a aba aberta: Pedido recebido (ou recusado),
// Notas e ordens (aceite, OS e pagamento), Pedido, Retificação, Entregue (entrega ou conclusão).
function momentoDaAba(c) {
  const aba = abaPorChave(abaAberta).chave;
  if (aba === 'entrada') return c.recusado_em && !c.etapa ? 'recusado' : 'recebido';
  if (aba === 'entregue') return c.etapa === 'concluido' ? 'concluido' : 'entregue';
  return aba;
}

function atualizarMensagens(c) {
  const qual = momentoDaAba(c);
  const opcoes = { versao: versaoDaEntrega(c) };
  for (const botaoMensagem of janela().querySelectorAll('[data-mensagem]')) {
    const url = botaoMensagem.dataset.mensagem === 'whatsapp' ? linkWhatsAppMensagem(c, qual, opcoes) : linkEmailMensagem(c, qual, opcoes);
    botaoMensagem.hidden = !url;
    if (url) botaoMensagem.href = url;
    botaoMensagem.title = `Mensagem pronta: ${MOMENTOS[qual]}`;
  }
}

// ---------- Envio ao cliente (Conclusão) ----------

// Versão da entrega: v1 na primeira, v2 depois da primeira retificação, e assim por diante.
const versaoDaEntrega = c => (c.retificacoes || 0) + 1;
const nomeZip = (c, versao) => `${c.protocolo || `Plannex-${c.id}`}_v${versao}.zip`;

// Arquivos da versão atual: os enviados depois da última retificação (ou todos, se não houve).
function arquivosDaVersao() {
  const entrega = dados.arquivos.filter(a => a.categoria === 'entrega');
  const reprovada = [...dados.itens].reverse().find(i => i.tipo === 'etapa' && i.para === 'revisado');
  if (!reprovada) return entrega;
  const novos = entrega.filter(a => String(a.criado_em) > String(reprovada.quando));
  return novos.length ? novos : entrega;
}

function blocoEnvioCliente(c) {
  const versao = versaoDaEntrega(c);
  const nome = nomeZip(c, versao);
  const resumo = el('p', 'envio-resumo', 'Carregando os arquivos da entrega…');
  resumo.dataset.envioResumo = '';

  // Baixa os arquivos da versão atual e junta num ZIP.
  const baixarZip = async evento => {
    const botaoClicado = evento.currentTarget;
    botaoClicado.disabled = true;
    try {
      if (!dados.carregado) await carregar();
      const lista = arquivosDaVersao();
      if (!lista.length) throw new Error('Ainda não há arquivos da entrega para juntar no ZIP.');
      const conteudos = await Promise.all(lista.map(async a => {
        const resposta = await fetch(`/api/arquivos/${a.id}`, { credentials: 'same-origin' });
        if (!resposta.ok) throw new Error(`Não foi possível baixar ${a.nome}.`);
        return { nome: a.nome, bytes: new Uint8Array(await resposta.arrayBuffer()), data: new Date(a.criado_em) };
      }));
      const zip = criarZip(conteudos);
      const baixar = document.createElement('a');
      baixar.href = URL.createObjectURL(zip);
      baixar.download = nome;
      document.body.append(baixar);
      baixar.click();
      baixar.remove();
      setTimeout(() => URL.revokeObjectURL(baixar.href), 4000);
      acoes.avisar(`${nome} baixado.`);
    } catch (e) {
      acoes.avisar(e.message || 'Não foi possível montar o ZIP.', 'erro');
    } finally {
      botaoClicado.disabled = false;
    }
  };

  return el('section', 'bloco bloco--envio',
    el('div', 'bloco-topo', el('h3', 'titulo-icone', icone('baixar'), 'Arquivos para o cliente'), el('span', 'versao-entrega', `v${versao}`)),
    el('div', 'envio-linha', resumo, botao(`Baixar em ZIP`, 'botao--primario botao--pequeno', baixarZip, { icone: 'baixar', titulo: `Baixa ${nome} com os arquivos da versão ${versao}` })));
}

// "Entregue em … por …". O administrador corrige o dia quando a entrega foi registrada depois.
function registroDaEntrega(c, registro) {
  const quando = registro?.quando || c.atualizado_em;
  const texto = el('span', 'chamada-texto', el('strong', '', 'Entregue'), ` em ${dataHora(quando)}${registro ? ` por ${registro.usuario || 'usuário removido'}` : ''}.`);
  const caixa = el('div', 'chamada-entrega is-feita', icone('ok'), texto);
  if (!eAdmin()) return caixa;

  const data = el('input');
  data.type = 'date';
  data.min = '2000-01-01';
  data.max = '2100-12-31';
  data.setAttribute('aria-label', 'Dia da entrega');
  const local = new Date(quando);
  data.value = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
  const salvar = botao('Salvar', 'botao--primario botao--pequeno', null);
  salvar.type = 'submit';
  const form = el('form', 'entrega-data', data, salvar, botao('Cancelar', 'botao--fantasma botao--pequeno', () => { form.hidden = true; alterar.hidden = false; }));
  form.hidden = true;
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    if (!data.value) return;
    // Mantém o horário registrado; muda só o dia.
    const novo = new Date(`${data.value}T${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}:00`);
    if (Number.isNaN(novo.getTime())) return;
    const confirmado = await acoes.confirmar({
      titulo: 'Alterar a data de entrega?',
      texto: `A entrega de ${c.nome} passa a constar em ${diaBr(data.value)}. Fica registrado no histórico.`,
      de: diaBr(diaDe(new Date(quando).toISOString())),
      para: diaBr(data.value),
      botao: 'Alterar data',
    });
    if (!confirmado) return;
    salvar.disabled = true;
    const ok = await acoes.alterar(c.id, { entregue_em: novo.toISOString() }, `Data da entrega corrigida para ${diaBr(data.value)}.`);
    salvar.disabled = false;
    if (ok) await depoisDeMudar();
  });
  const alterar = botao('Alterar data', 'botao--fantasma botao--pequeno', () => { form.hidden = false; alterar.hidden = true; data.focus(); }, { icone: 'agenda', titulo: 'Corrigir o dia em que a demanda foi entregue' });
  caixa.append(el('span', 'chamada-acoes', alterar, form));
  return caixa;
}

// Depois de enviar um arquivo final, oferece concluir na hora.
function perguntarSeConclui(c) {
  if (fechada(contatoPorId(c.id)?.etapa)) return;
  acoes.avisar('Arquivo da entrega anexado.', 'ok', { rotulo: 'Concluir agora', aoClicar: () => concluir(c) });
}

function concluir(c) {
  const reprovada = [...dados.itens].reverse().find(i => i.tipo === 'etapa' && i.para === 'revisado');
  const desde = c.etapa === 'revisado' && reprovada ? String(reprovada.quando) : '';
  const finais = dados.arquivos.filter(a => a.categoria === 'entrega' && a.tamanho > 1024 && (!desde || String(a.criado_em) > desde)).length;
  if (!finais && !eAdmin()) {
    acoes.avisar(desde ? 'Envie a nova versão (um arquivo de mais de 1 KB) antes de entregar.' : 'Envie o arquivo da entrega (qualquer tipo, com mais de 1 KB) antes de entregar.', 'erro');
    return;
  }
  acoes.mover(c.id, 'entregue');
}

function ultimaEntrega() {
  return [...dados.itens].reverse().find(i => i.tipo === 'etapa' && i.para === 'entregue') || null;
}

// ---------- Ações rápidas ----------

function acoesRapidas(c) {
  const barra = el('div', 'ficha-acoes');
  if (!eAdmin()) return barra;
  // O contato do cliente (WhatsApp e e-mail) fica com o administrador. A mensagem pronta segue a aba
  // do andamento que está aberta (atualizada em desenharPainel).
  if (c.telefone || c.email) {
    const whatsapp = link('WhatsApp', '#', 'botao botao--whatsapp', { icone: 'whatsapp', novaAba: true });
    whatsapp.dataset.mensagem = 'whatsapp';
    const email = link('E-mail', '#', 'botao', { icone: 'email' });
    email.dataset.mensagem = 'email';
    barra.append(whatsapp, email);
  }
  // Ordem de serviço da casa, já preenchida com o que o cliente informou.
  const os = botao('Gerar OS', '', null, { icone: 'documento', titulo: 'Baixa a ordem de serviço em PDF já preenchida; o resto se completa no PDF e o cliente assina' });
  os.addEventListener('click', async () => {
    os.disabled = true;
    try {
      if (!dados.carregado) await carregar();
      const nome = await gerarOS(c, dados.arquivos.filter(a => a.categoria === 'cliente'));
      acoes.avisar(`${nome} baixada.`);
    } catch (e) {
      acoes.avisar(e.message || 'Não foi possível gerar a ordem de serviço.', 'erro');
    } finally {
      os.disabled = false;
    }
  });
  barra.append(os);
  if (c.arquivado_em) {
    barra.append(botao('Restaurar', 'botao--fantasma', () => acoes.alterar(c.id, { arquivado: false }, 'Contato restaurado.'), { icone: 'restaurar' }));
  } else {
    barra.append(botao('Arquivar', 'botao--fantasma', () => acoes.alterar(c.id, { arquivado: true }, 'Contato arquivado. Ele fica na aba Arquivo.'), { icone: 'arquivo', titulo: 'Para contatos que não fecharam. Nada é apagado.' }));
  }
  barra.append(botaoDoisCliques('Excluir', 'Confirmar exclusão', 'botao--perigo', 'lixo', async () => {
    try {
      await api(`/api/contatos/${c.id}`, { method: 'DELETE' });
      janela().close();
      acoes.avisar(`${c.nome} foi excluído. O e-mail recebido continua na caixa de e-mail.`);
      acoes.recarregar();
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    }
  }));
  return barra;
}

function botaoDoisCliques(rotulo, rotuloConfirmar, classe, nomeIcone, aoConfirmar) {
  const b = botao(rotulo, classe, null, { icone: nomeIcone });
  let confirmando = false;
  const texto = b.querySelector('span');
  b.addEventListener('click', () => {
    if (!confirmando) {
      confirmando = true;
      if (texto) texto.textContent = rotuloConfirmar;
      b.classList.add('is-confirmando');
      setTimeout(() => {
        confirmando = false;
        if (texto) texto.textContent = rotulo;
        b.classList.remove('is-confirmando');
      }, 4000);
      return;
    }
    aoConfirmar();
  });
  return b;
}

// ---------- Contato e solicitação ----------

function blocoContato(c) {
  const titulo = el('div', 'bloco-topo', el('h3', '', 'Contato'),
    !eAdmin() ? null : botao(editandoDados ? 'Cancelar' : 'Editar', 'botao--fantasma botao--pequeno', () => { editandoDados = !editandoDados; desenharPainel(); }, { icone: editandoDados ? 'fechar' : 'editar' }));
  if (editandoDados) return el('section', 'bloco', titulo, formularioDados(c));

  const copiar = (valor, rotulo) => botao('', 'botao--icone botao--fantasma botao--pequeno', async () => {
    try {
      await navigator.clipboard.writeText(valor);
      acoes.avisar(`${rotulo} copiado.`);
    } catch {
      acoes.avisar('Não foi possível copiar.', 'erro');
    }
  }, { icone: 'copiar', titulo: `Copiar ${rotulo.toLowerCase()}` });

  return el('section', 'bloco', titulo, el('dl', 'dados',
    item('WhatsApp', c.telefone ? el('span', 'com-acao', c.telefone, copiar(c.telefone, 'Telefone')) : null),
    item('E-mail', c.email ? el('span', 'com-acao', c.email, copiar(c.email, 'E-mail')) : null),
    item('CPF/CNPJ', c.cpf ? el('span', 'com-acao', c.cpf, copiar(c.cpf, 'CPF/CNPJ')) : null),
    item('Protocolo', c.protocolo ? el('span', 'com-acao', c.protocolo, copiar(c.protocolo, 'Protocolo')) : null),
    item('Chegou em', dataHora(c.criado_em)),
    c.criado_por ? item('Cadastrado por', usuarioPorId(c.criado_por)?.nome || 'usuário removido') : null));
}

function formularioDados(c) {
  const form = el('form', 'form-dados');
  const campo = (rotulo, nome, valor, tipo = 'text') => {
    const entrada = el(tipo === 'textarea' ? 'textarea' : 'input');
    if (tipo !== 'textarea') entrada.type = tipo;
    entrada.name = nome;
    entrada.value = valor || '';
    if (tipo === 'textarea') entrada.rows = 4;
    return el('label', 'campo', rotulo, entrada);
  };
  const servico = el('select');
  servico.name = 'servico';
  for (const [chave, info] of Object.entries(SERVICOS)) servico.append(opcao(chave, info.nome, chave === c.servico));
  form.append(
    campo('Nome', 'nome', c.nome),
    el('div', 'campos-lado campos-lado--3', campo('WhatsApp', 'telefone', c.telefone, 'tel'), campo('E-mail', 'email', c.email, 'email'), campo('CPF/CNPJ', 'cpf', c.cpf)),
    el('label', 'campo', 'Serviço', servico),
    campo('Necessidade', 'descricao', c.descricao, 'textarea'),
    campo('Observações', 'observacoes', c.observacoes, 'textarea'),
    el('div', 'form-acoes', botao('Salvar dados', 'botao--primario', null)));
  form.querySelector('.form-acoes button').type = 'submit';
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    const ok = await acoes.alterar(c.id, { dados: Object.fromEntries(new FormData(form)) }, 'Dados do contato salvos.');
    if (ok) {
      editandoDados = false;
      desenharPainel();
    }
  });
  return form;
}

const ENVIO_DOCUMENTOS = { 'Anexar agora': 'Sim', 'Enviar posteriormente': 'Não, vai enviar depois' };

function blocoSolicitacao(c, { comEnvio = false } = {}) {
  const campos = [
    item('Serviço', SERVICOS[c.servico]?.completo || SERVICOS[c.servico]?.nome),
    item('Plano de interesse', c.plano),
    item('Necessidade', c.descricao, true),
    item('Atividade manual a automatizar', c.atividade_manual, true),
    item('O que deve permanecer inalterado', c.manter_inalterado, true),
  ];
  // Anexo do cliente: a resposta do site e, embaixo, os arquivos (os que chegaram depois também).
  const lista = el('ul', 'documentos documentos--miniaturas', el('li', 'carregando', 'Carregando…'));
  lista.dataset.lista = 'arquivos';
  lista.dataset.categorias = 'cliente';
  if (!comEnvio) lista.dataset.ocultarVazio = c.envio_documentos ? 'lista' : 'tudo';
  const resposta = ENVIO_DOCUMENTOS[c.envio_documentos] || c.envio_documentos;
  const anexo = el('div', 'dado dado--largo', el('dt', '', 'Anexo do cliente'), el('dd', '', resposta ? el('span', 'resposta', resposta) : null, lista));
  campos.push(anexo, item('Observações adicionais', c.observacoes, true));

  const partes = [el('div', 'bloco-topo', el('h3', 'titulo-icone', icone('documento'), 'Solicitação')), el('dl', 'dados dados--texto', campos)];
  if (comEnvio && !somenteLeitura(c)) partes.push(...zonaDeEnvio(c, 'cliente'));
  return el('section', 'bloco bloco--solicitacao', partes);
}

// "largo": textos longos ocupam a linha toda; os curtos ficam lado a lado.
function item(rotulo, valor, largo = false) {
  if (valor === null || valor === undefined || valor === '') return null;
  return el('div', `dado${largo ? ' dado--largo' : ''}`, el('dt', '', rotulo), el('dd', '', valor));
}

// ---------- Entrega (responsável e prazo) e negócio (valores) ----------

function salvarCampos(c, indicador) {
  return async campos => {
    const ok = await acoes.alterar(c.id, campos, null);
    if (ok && indicador) {
      indicador.hidden = false;
      clearTimeout(indicador._espera);
      indicador._espera = setTimeout(() => { indicador.hidden = true; }, 1800);
    }
  };
}

function indicadorSalvo() {
  const salvo = el('span', 'salvo', icone('ok'), 'Salvo');
  salvo.hidden = true;
  return salvo;
}

function blocoEntrega(c) {
  const prazo = !fechada(c.etapa) ? situacaoPrazo(c.prazo) : null;
  const chipPrazo = prazo ? el('span', `chip-prazo chip-prazo--${prazo.classe}`, prazo.texto) : null;
  if (!eAdmin()) {
    const responsavel = usuarioPorId(c.responsavel_id);
    return el('section', 'bloco',
      el('div', 'bloco-topo', el('h3', '', 'Entrega')),
      el('dl', 'dados',
        item('Responsável', responsavel ? `${responsavel.nome}${responsavel.id === estado.usuario.id ? ' (você)' : ''}` : 'Ninguém'),
        item('Prazo de entrega', c.prazo ? el('span', 'com-acao', diaBr(c.prazo), chipPrazo) : 'Sem prazo definido')));
  }
  const salvo = indicadorSalvo();
  const salvar = salvarCampos(c, salvo);
  const responsavel = el('select');
  if (c.etapa !== 'pedido') responsavel.append(opcao('', 'Ninguém'));
  for (const u of estado.usuarios) responsavel.append(opcao(String(u.id), u.id === estado.usuario.id ? `${u.nome} (você)` : u.nome));
  responsavel.value = c.responsavel_id ? String(c.responsavel_id) : '';
  responsavel.addEventListener('change', () => salvar({ responsavel_id: responsavel.value ? Number(responsavel.value) : null }));
  return el('section', 'bloco',
    el('div', 'bloco-topo', el('h3', '', 'Entrega'), salvo),
    el('div', 'negocio',
      el('label', 'campo', 'Responsável', responsavel),
      el('label', 'campo', el('span', '', 'Prazo de entrega', chipPrazo), campoData(c.prazo, valor => salvar({ prazo: valor })))));
}

function blocoNegocio(c) {
  const salvo = indicadorSalvo();
  const salvar = salvarCampos(c, salvo);

  const valor = el('input');
  valor.inputMode = 'decimal';
  valor.placeholder = '0,00';
  valor.value = centavosParaCampo(c.valor_centavos);
  valor.addEventListener('change', () => {
    const centavos = lerReais(valor.value);
    if (Number.isNaN(centavos)) {
      acoes.avisar('Valor inválido. Use, por exemplo, 149,90.', 'erro');
      valor.value = centavosParaCampo(c.valor_centavos);
      return;
    }
    valor.value = centavosParaCampo(centavos);
    salvar({ valor_centavos: centavos });
  });

  const nota = el('input');
  nota.placeholder = 'Nº da nota';
  nota.maxLength = 40;
  nota.value = c.nota_fiscal || '';
  nota.addEventListener('change', () => salvar({ nota_fiscal: nota.value.trim() || null }));

  return el('section', 'bloco bloco--negocio',
    el('div', 'bloco-topo', el('h3', '', 'Valores e pagamento'), salvo),
    el('div', 'negocio',
      el('label', 'campo campo--reais', 'Valor', el('span', 'prefixo', el('i', '', 'R$'), valor)),
      el('label', 'campo', 'Nota fiscal', nota),
      el('div', 'campo campo--largo', el('span', 'campo-rotulo', 'Pagamento recebido em'), campoData(c.pago_em, data => salvar({ pago_em: data }), { comHoje: true }))),
    c.valor_centavos !== null && c.valor_centavos !== undefined
      ? el('p', `negocio-resumo${c.pago_em ? ' is-pago' : ''}`, icone(c.pago_em ? 'ok' : 'dinheiro'),
        c.pago_em ? `${reais(c.valor_centavos)} recebidos em ${diaBr(c.pago_em)}` : `${reais(c.valor_centavos)} a receber`)
      : null);
}

// Data só é salva completa (o campo do navegador manda 0002, 0020... enquanto se digita o ano).
// "comHoje": um botãozinho ao lado que preenche com a data de hoje.
function campoData(valorAtual, aoMudar, { comHoje = false } = {}) {
  const entrada = el('input');
  entrada.type = 'date';
  entrada.min = '2000-01-01';
  entrada.max = '2100-12-31';
  entrada.value = valorAtual || '';
  let ultimo = valorAtual || '';
  const gravar = () => {
    const valor = entrada.value;
    if (valor === ultimo) return;
    if (valor && !dataCompleta(valor)) return;
    ultimo = valor;
    aoMudar(valor || null);
  };
  let espera;
  entrada.addEventListener('change', () => { clearTimeout(espera); espera = setTimeout(gravar, 900); });
  entrada.addEventListener('blur', () => { clearTimeout(espera); gravar(); });
  if (!comHoje) return entrada;
  const agora = botao('Hoje', 'botao--fantasma botao--pequeno', () => {
    clearTimeout(espera);
    entrada.value = hoje();
    gravar();
  }, { titulo: 'Preencher com a data de hoje' });
  return el('span', 'data-com-hoje', entrada, agora);
}

function dataCompleta(valor) {
  const ano = Number(String(valor).slice(0, 4));
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && ano >= 2000 && ano <= 2100;
}

function opcao(valor, texto, selecionada = false) {
  const o = el('option', '', texto);
  o.value = valor;
  o.selected = selecionada;
  return o;
}

// ---------- Arquivos ----------

function blocoArquivos(c, categorias, opcoes = {}) {
  const visiveis = categorias.filter(cat => eAdmin() || CATEGORIAS_FUNCIONARIO.includes(cat));
  const lista = el('ul', 'documentos documentos--miniaturas', el('li', 'carregando', 'Carregando…'));
  lista.dataset.lista = 'arquivos';
  lista.dataset.categorias = visiveis.join(',');
  const partes = [el('div', 'bloco-topo', el('h3', 'titulo-icone', icone(opcoes.icone || 'anexo'), opcoes.titulo)), lista];
  const envio = opcoes.envio || visiveis[0];
  if (!somenteLeitura(c) && visiveis.includes(envio)) partes.push(...zonaDeEnvio(c, envio, opcoes.aoEnviar));
  return el('section', 'bloco bloco--documentos', partes);
}

function zonaDeEnvio(c, categoria, aoEnviar) {
  const id = `envio-${++sequencia}`;
  const entrada = el('input');
  entrada.type = 'file';
  entrada.multiple = true;
  entrada.className = 'sr';
  entrada.id = id;

  const status = el('p', 'aviso');
  const zona = el('label', 'zona-envio', icone('enviar'),
    el('span', '', el('strong', '', 'Escolha um arquivo'), ' ou arraste para cá'),
    el('small', '', 'Qualquer tipo de arquivo, menos programas · até 10 MB'));
  zona.htmlFor = id;

  const enviarUm = async arquivo => {
    if (arquivo.size > 10 * 1024 * 1024) throw new Error(`${arquivo.name} passa de 10 MB.`);
    const corpo = new FormData();
    corpo.append('categoria', categoria);
    corpo.append('arquivo', arquivo);
    const resposta = await fetch(`/api/contatos/${c.id}/arquivos`, { method: 'POST', body: corpo, credentials: 'same-origin' });
    const retorno = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(retorno.erro || 'Não foi possível enviar.');
  };
  const enviar = async arquivos => {
    arquivos = [...(arquivos || [])];
    if (!arquivos.length) return;
    status.classList.remove('is-ok');
    zona.classList.add('is-enviando');
    let enviados = 0;
    try {
      for (const arquivo of arquivos) {
        status.textContent = `Enviando ${arquivo.name}…`;
        await enviarUm(arquivo);
        enviados++;
      }
      status.textContent = enviados === 1 ? `${arquivos[0].name} anexado.` : `${enviados} arquivos anexados.`;
      status.classList.add('is-ok');
    } catch (e) {
      status.textContent = e.message;
    } finally {
      entrada.value = '';
      zona.classList.remove('is-enviando');
      if (enviados) {
        await depoisDeMudar();
        if (aoEnviar) aoEnviar();
      }
    }
  };
  entrada.addEventListener('change', () => enviar(entrada.files));
  zona.addEventListener('dragover', evento => { evento.preventDefault(); zona.classList.add('is-alvo'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('is-alvo'));
  zona.addEventListener('drop', evento => {
    evento.preventDefault();
    zona.classList.remove('is-alvo');
    enviar(evento.dataTransfer.files);
  });
  return [el('div', 'envio envio--simples', entrada, zona), status];
}

// ---------- Moldes em branco ----------
// A ordem de serviço e o relatório da casa, para baixar e preencher. Enviar outro substitui o atual.

const MOLDES = [
  { tipo: 'ordem', nome: 'Ordem de serviço' },
  { tipo: 'relatorio', nome: 'Relatório' },
];

function blocoMoldes(tipos) {
  const lista = MOLDES.filter(m => tipos.includes(m.tipo));
  const titulo = lista.length === 1 ? `Molde em branco: ${lista[0].nome.toLowerCase()}` : 'Moldes em branco';
  return el('section', 'bloco bloco--moldes',
    el('div', 'bloco-topo', el('h3', 'titulo-icone', icone('baixar'), titulo)),
    el('ul', 'moldes', lista.map(linhaMolde)));
}

function linhaMolde({ tipo, nome }) {
  const molde = (estado.moldes || []).find(m => m.tipo === tipo);
  const entrada = el('input');
  entrada.type = 'file';
  entrada.accept = '.pdf,.doc,.docx';
  entrada.className = 'sr';
  entrada.addEventListener('change', async () => {
    const arquivo = entrada.files[0];
    if (!arquivo) return;
    const corpo = new FormData();
    corpo.append('arquivo', arquivo);
    try {
      const resposta = await fetch(`/api/moldes/${tipo}`, { method: 'POST', body: corpo, credentials: 'same-origin' });
      const retorno = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(retorno.erro || 'Não foi possível enviar.');
      acoes.avisar(`Molde de ${nome.toLowerCase()} atualizado.`);
      await acoes.recarregar({ silencioso: true });
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    } finally {
      entrada.value = '';
    }
  });
  const trocar = !eAdmin() ? null : botao(molde ? 'Trocar' : 'Enviar molde', 'botao--fantasma botao--pequeno', () => entrada.click(), {
    icone: 'enviar', titulo: molde ? `Enviar outro molde de ${nome.toLowerCase()} (substitui o atual)` : `Enviar o molde de ${nome.toLowerCase()} (PDF ou Word)`,
  });

  if (!molde) {
    return el('li', 'molde is-vazio', miniatura(tipo === 'ordem' ? 'molde.pdf' : 'molde.docx'),
      el('span', 'molde-texto', el('strong', '', nome), el('small', '', eAdmin() ? 'Nenhum molde enviado' : 'O administrador ainda não enviou o molde')),
      trocar ? el('span', 'molde-acoes', trocar) : null, trocar ? entrada : null);
  }
  const baixar = el('a', 'botao botao--primario botao--pequeno', icone('baixar'), el('span', '', 'Baixar'));
  baixar.href = `/api/moldes/${tipo}`;
  baixar.download = molde.nome;
  baixar.title = `Baixar ${molde.nome}`;
  return el('li', 'molde', miniatura(molde.nome),
    el('span', 'molde-texto', el('strong', '', nome), el('small', '', `${molde.nome} · ${tamanhoArquivo(molde.tamanho)}`)),
    el('span', 'molde-acoes', baixar, trocar), trocar ? entrada : null);
}

// Miniatura do arquivo: uma folhinha com a cor e a sigla do tipo (PDF, DOC, XLS…).
function miniatura(nome) {
  const tipo = tipoArquivo(nome);
  const m = el('span', `miniatura miniatura--${tipo.classe}`, el('span', 'miniatura-sigla', tipo.rotulo));
  m.setAttribute('aria-hidden', 'true');
  return m;
}

function preencherArquivos() {
  for (const lista of janela().querySelectorAll('[data-lista="arquivos"]')) {
    const categorias = lista.dataset.categorias.split(',');
    const arquivos = dados.arquivos.filter(a => categorias.includes(a.categoria));
    // Na solicitação, sem arquivos, some a lista (ou o item todo, se o cliente nem respondeu).
    const ocultar = lista.dataset.ocultarVazio;
    lista.hidden = !arquivos.length && Boolean(ocultar);
    const dado = lista.closest('.dado');
    if (dado) dado.hidden = !arquivos.length && ocultar === 'tudo';
    if (!arquivos.length) {
      lista.replaceChildren(el('li', 'vazio-mini', 'Nenhum arquivo ainda.'));
      continue;
    }
    const c = contatoPorId(atualId);
    lista.replaceChildren(...arquivos.map(a => {
      const baixar = el('a', 'documento-nome', miniatura(a.nome), el('span', '', a.nome));
      baixar.href = `/api/arquivos/${a.id}`;
      baixar.download = a.nome;
      baixar.title = `Baixar ${a.nome}`;
      const autor = a.usuario || (a.usuario_id ? 'usuário removido' : 'enviado pelo cliente no site');
      const li = el('li', `documento documento--${a.categoria}`,
        baixar,
        el('span', 'documento-info', `${tamanhoArquivo(a.tamanho)} · ${autor} · ${dataHora(a.criado_em)}`));
      const podeRemover = eAdmin() || (a.usuario_id === estado.usuario.id && !somenteLeitura(c));
      if (podeRemover) {
        li.append(botaoDoisCliques('', '', 'botao--icone botao--fantasma botao--pequeno', 'lixo', async () => {
          try {
            await api(`/api/arquivos/${a.id}`, { method: 'DELETE' });
            await depoisDeMudar();
          } catch (e) {
            acoes.avisar(e.message, 'erro');
          }
        }));
        li.lastChild.title = `Remover ${a.nome} (clique duas vezes)`;
      }
      return li;
    }));
  }
}

// ---------- Comentários de cada aba ----------

function comentarios(c, abas, titulo, exemplo, { destaque = false } = {}) {
  const [aba] = [].concat(abas);
  const lista = el('ol', 'comentarios', el('li', 'carregando', 'Carregando…'));
  lista.dataset.lista = 'comentarios';
  lista.dataset.aba = [].concat(abas).join(',');
  const partes = [el('div', 'bloco-topo', el('h3', 'titulo-icone', icone('nota'), titulo)), lista];
  if (!somenteLeitura(c)) {
    const texto = el('textarea');
    texto.rows = 3;
    texto.maxLength = 2000;
    texto.placeholder = `${exemplo} (Ctrl+Enter salva)`;
    texto.setAttribute('aria-label', titulo);
    const salvar = botao('Comentar', 'botao--primario botao--pequeno', null, { icone: 'nota' });
    const enviar = async () => {
      const conteudo = texto.value.trim();
      if (!conteudo) return;
      salvar.disabled = true;
      try {
        await api(`/api/contatos/${c.id}/notas`, { method: 'POST', corpo: { texto: conteudo, aba } });
        texto.value = '';
        texto.blur();
        await depoisDeMudar();
      } catch (e) {
        acoes.avisar(e.message, 'erro');
      } finally {
        salvar.disabled = false;
      }
    };
    salvar.addEventListener('click', enviar);
    texto.addEventListener('keydown', evento => {
      if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) enviar();
    });
    partes.push(el('div', 'anotar', texto, salvar));
  }
  return el('section', `bloco bloco--comentarios${destaque ? ' is-destaque' : ''}`, partes);
}

function preencherComentarios() {
  for (const lista of janela().querySelectorAll('[data-lista="comentarios"]')) {
    const abas = lista.dataset.aba.split(',');
    const notas = dados.itens.filter(i => i.tipo === 'nota' && abas.includes(i.aba || 'entrada'));
    lista.replaceChildren(...(notas.length ? notas.map(comentario) : [el('li', 'vazio-mini', 'Nenhum comentário ainda.')]));
  }
}

function comentario(i) {
  const quem = i.usuario || (i.usuario_id ? 'usuário removido' : 'Alguém');
  const li = el('li', 'comentario', avatar(quem, 'avatar--pequeno'),
    el('div', 'comentario-corpo', el('div', 'comentario-topo', el('strong', '', quem), el('time', '', dataHora(i.quando))), el('p', '', i.texto)));
  if (i.usuario_id === estado.usuario.id) {
    li.append(botao('', 'botao--icone botao--fantasma botao--pequeno apagar-nota', async () => {
      try {
        await api(`/api/notas/${i.nota_id}`, { method: 'DELETE' });
        await depoisDeMudar();
      } catch (e) {
        acoes.avisar(e.message, 'erro');
      }
    }, { icone: 'lixo', titulo: 'Apagar meu comentário' }));
  }
  return li;
}

// ---------- Histórico completo ----------

function historicoCompleto() {
  const lista = el('ol', 'linha-tempo', el('li', 'carregando', 'Carregando…'));
  lista.dataset.lista = 'historico';
  return el('details', 'historico-completo', el('summary', '', icone('relogio'), 'Histórico completo'), lista);
}

function preencherHistorico() {
  const lista = janela().querySelector('[data-lista="historico"]');
  if (!lista) return;
  const c = contatoPorId(atualId);
  const chegada = { tipo: 'chegada', quando: c.criado_em };
  lista.replaceChildren(...[...dados.itens].reverse().concat(chegada).map(i => itemHistorico(i, c)));
  const resumo = janela().querySelector('.historico-completo summary');
  if (resumo) resumo.lastChild.textContent = `Histórico completo (${dados.itens.length + 1})`;
}

function itemHistorico(i, c) {
  const quem = i.usuario || (i.usuario_id ? 'usuário removido' : '');
  let iconeItem = 'sistema';
  let conteudo;
  if (i.tipo === 'chegada') {
    iconeItem = 'chegada';
    const autor = c.criado_por ? usuarioPorId(c.criado_por)?.nome : null;
    conteudo = el('p', '', autor ? `${autor} cadastrou o contato (${ORIGENS[c.origem] || c.origem})` : `Chegou pelo site · ${SERVICOS[c.servico]?.completo}`);
  } else if (i.tipo === 'etapa') {
    iconeItem = 'etapa';
    conteudo = el('p', '', el('strong', '', quem || 'Alguém'), ` moveu de ${i.de ? NOME_ETAPA[i.de] : CAIXA} para ${i.para ? NOME_ETAPA[i.para] : CAIXA}`);
  } else if (i.tipo === 'nota') {
    iconeItem = 'nota';
    const aba = ABAS.find(a => a.chave === (i.aba || 'entrada'));
    conteudo = el('div', 'nota-texto', el('strong', '', quem || 'Alguém'), el('small', '', ` comentou em ${aba?.nome || 'Caixa de entrada'}`), el('p', '', i.texto));
  } else {
    conteudo = el('p', '', el('strong', '', quem || 'O cliente'), ` ${i.texto}`);
  }
  return el('li', `evento-linha evento-linha--${i.tipo}`,
    el('span', 'evento-icone', icone(iconeItem)),
    el('div', 'evento-conteudo', conteudo, el('time', '', dataHora(i.quando))));
}

function preencherEnvio() {
  const resumo = janela().querySelector('[data-envio-resumo]');
  if (!resumo || !dados.carregado) return;
  const lista = arquivosDaVersao();
  const c = contatoPorId(atualId);
  resumo.replaceChildren(lista.length
    ? `${lista.length} arquivo${lista.length > 1 ? 's' : ''} da versão ${versaoDaEntrega(c)}: ${lista.map(a => a.nome).join(', ')}.`
    : 'Ainda não há arquivos da entrega.');
}

function preencher() {
  preencherEnvio();
  if (!dados.carregado) return;
  preencherArquivos();
  preencherComentarios();
  preencherHistorico();
  // Na aba Entregue, o registro do dia depende da linha do tempo: redesenha a chamada quando ela chega.
  const chamada = janela().querySelector('.chamada-entrega.is-feita');
  const registro = chamada ? ultimaEntrega() : null;
  if (chamada && registro) chamada.querySelector('.chamada-texto')?.replaceChildren(el('strong', '', 'Entregue'), ` em ${dataHora(registro.quando)} por ${registro.usuario || 'usuário removido'}.`);
}
