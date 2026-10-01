// Ficha do contato em abas, uma por etapa do andamento:
//   Caixa de entrada (junta a chegada e o Pedido): contato, solicitação, entrega e documentos do cliente.
//   Notas e ordens (só administrador): valores, pagamento, nota fiscal e ordem de serviço.
//   Processo iniciado: prazo, documentos do cliente e anotações do processo.
//   Revisado pelo cliente: o que o cliente pediu para ajustar.
//   Entregue: arquivos finais (Excel, relatório), comentário e o registro do dia da entrega.
// Clicar numa aba só mostra o conteúdo; mudar de etapa é pelo botão de ação, com confirmação.
import { estado, acoes, contatoPorId, usuarioPorId, eAdmin } from './estado.js';
import { api } from './api.js';
import {
  el, botao, link, icone, avatar, etiquetaServico, NOME_ETAPA, CAIXA, SERVICOS, ORIGENS, ETAPAS,
  dataHora, relativo, reais, lerReais, centavosParaCampo, situacaoPrazo, linkWhatsApp, linkEmail, diaBr, tamanhoArquivo,
} from './util.js';

const CATEGORIAS = {
  cliente: 'Documento do cliente', ordem: 'Ordem de serviço', nota: 'Nota fiscal', outro: 'Outro', entrega: 'Arquivo da entrega',
};
// O funcionário vê e envia só documentos do cliente e arquivos da entrega.
const CATEGORIAS_FUNCIONARIO = ['cliente', 'entrega'];
// Etapas em que o funcionário trabalha. Pedido e Notas e ordens são do administrador.
const ETAPAS_FUNCIONARIO = ['processo_iniciado', 'revisado', 'entregue'];

const ABAS = [
  { chave: 'entrada', nome: 'Caixa de entrada', etapas: [null, 'pedido'] },
  { chave: 'nota_emitida', nome: 'Notas e ordens', etapas: ['nota_emitida'], admin: true },
  { chave: 'processo_iniciado', nome: 'Processo iniciado', etapas: ['processo_iniciado'] },
  { chave: 'revisado', nome: 'Revisado pelo cliente', etapas: ['revisado'] },
  { chave: 'entregue', nome: 'Entregue', etapas: ['entregue'] },
];
const abaDaEtapa = etapa => ABAS.find(a => a.etapas.includes(etapa ?? null)).chave;
const indiceAba = chave => ABAS.findIndex(a => a.chave === chave);

const janela = () => document.querySelector('#ficha');
let atualId = null;
let abaAberta = 'entrada';
let editandoDados = false;
let dados = { itens: [], arquivos: [], carregado: false };
let sequencia = 0;

// Para o funcionário, a demanda concluída fica só para consulta.
const somenteLeitura = c => !eAdmin() && c.etapa === 'entregue';
// O funcionário leva a demanda, de onde estiver, para Processo iniciado, Revisado pelo cliente e Entregue.
const podeMoverPara = (c, etapa) => eAdmin() || (ETAPAS_FUNCIONARIO.includes(etapa) && !somenteLeitura(c));
const podeVerAba = aba => !aba.admin || eAdmin();

export const fichaAberta = () => (janela().open ? atualId : null);

export function abrirFicha(id) {
  const contato = contatoPorId(id);
  if (!contato) {
    acoes.avisar('Esse contato não existe mais.', 'erro');
    return;
  }
  atualId = id;
  editandoDados = false;
  dados = { itens: [], arquivos: [], carregado: false };
  const aba = ABAS.find(a => a.chave === abaDaEtapa(contato.etapa));
  abaAberta = podeVerAba(aba) ? aba.chave : 'entrada';
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
      el('p', '', etiquetaServico(c.servico), el('span', '', origem), el('span', '', `chegou ${relativo(c.criado_em)}`, el('span', 'sr', ` (${dataHora(c.criado_em)})`)))),
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
    const situacao = i < atual ? 'feito' : i === atual ? 'atual' : 'futuro';
    const ponto = bloqueada ? icone('cadeado') : situacao === 'feito' ? icone('ok') : String(i + 1);
    const b = el('button', `trilha-passo trilha-passo--${situacao}${bloqueada ? ' is-bloqueado' : ''}${aba.chave === abaAberta ? ' is-aberta' : ''}`,
      el('span', 'trilha-ponto', ponto), el('span', 'trilha-nome', aba.nome));
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(aba.chave === abaAberta));
    b.setAttribute('aria-controls', 'ficha-painel');
    if (i === atual) b.setAttribute('aria-current', 'step');
    if (bloqueada) {
      b.disabled = true;
      b.title = 'Só administradores: tem os valores e pagamentos';
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

function acaoPrincipal(c) {
  const admin = eAdmin();
  if (c.etapa === 'entregue') return el('span', 'concluido', icone('ok'), admin ? 'Entregue' : 'Concluída');
  if (!admin && !ETAPAS_FUNCIONARIO.includes(c.etapa)) {
    return botao('Iniciar processo', 'botao--primario botao--pequeno', () => acoes.mover(c.id, 'processo_iniciado'), { icone: 'seta_dir' });
  }
  const indice = c.etapa ? ETAPAS.findIndex(([k]) => k === c.etapa) : -1;
  const [proxima, nome] = ETAPAS[indice + 1];
  if (proxima === 'entregue') return botao('Concluir demanda', 'botao--primario botao--pequeno', () => { abrirAba('entregue'); }, { icone: 'ok', titulo: 'Abre a aba Entregue para enviar os arquivos finais e concluir' });
  return botao(c.etapa ? `Avançar para ${nome}` : 'Aceitar como pedido', 'botao--primario botao--pequeno', () => acoes.mover(c.id, proxima), { icone: 'seta_dir' });
}

function abrirAba(chave) {
  abaAberta = chave;
  for (const b of janela().querySelectorAll('.trilha-passo')) {
    const aberta = b.querySelector('.trilha-nome').textContent === ABAS.find(a => a.chave === chave).nome;
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
  const aba = ABAS.find(a => a.chave === abaAberta);
  const conteudo = {
    entrada: painelEntrada,
    nota_emitida: painelNotas,
    processo_iniciado: painelProcesso,
    revisado: painelRevisado,
    entregue: painelEntregue,
  }[aba.chave](c);
  painel.replaceChildren(topoDoPainel(c, aba), ...conteudo, rodapeDoPainel(c, aba));
  preencher();
}

function topoDoPainel(c, aba) {
  const atual = indiceAba(abaDaEtapa(c.etapa));
  const i = indiceAba(aba.chave);
  const situacao = i < atual ? ['feito', 'Etapa concluída'] : i === atual ? ['atual', 'Etapa atual'] : ['futuro', 'Ainda não chegou aqui'];
  const extra = aba.chave === 'entrada' && c.etapa === 'pedido' ? ' · aceito como pedido' : '';
  return el('div', 'painel-topo', el('h3', '', aba.nome), el('span', `estado-aba estado-aba--${situacao[0]}`, situacao[1] + extra));
}

// Em outra aba que não a atual: atalho para mover para ela (com confirmação).
function rodapeDoPainel(c, aba) {
  if (abaDaEtapa(c.etapa) === aba.chave) return null;
  const destino = aba.chave === 'entrada' ? 'pedido' : aba.chave;
  if (!podeMoverPara(c, destino) || destino === 'entregue') return null;
  return el('div', 'painel-rodape', botao(`Mover a demanda para ${aba.nome}`, 'botao--fantasma botao--pequeno', () => acoes.mover(c.id, destino), { icone: 'etapa' }));
}

function painelEntrada(c) {
  return [
    el('div', 'ficha-grade',
      el('div', 'ficha-coluna', blocoContato(c), blocoSolicitacao(c)),
      el('div', 'ficha-coluna', blocoEntrega(c),
        blocoArquivos(c, ['cliente'], { titulo: 'Documentos do cliente', icone: 'documento', dica: 'Os que a pessoa enviou pelo site aparecem aqui sozinhos.' }))),
    comentarios(c, 'entrada', 'Comentários', 'Anotar algo sobre este contato…'),
  ];
}

function painelNotas(c) {
  return [
    el('p', 'dica-etapa', icone('cadeado'), 'Só administradores veem esta aba: valores, pagamento, notas fiscais e ordens de serviço.'),
    el('div', 'ficha-grade',
      el('div', 'ficha-coluna', blocoNegocio(c)),
      el('div', 'ficha-coluna', blocoArquivos(c, ['nota', 'ordem', 'outro'], { titulo: 'Notas e ordens de serviço', icone: 'anexo' }))),
    comentarios(c, 'nota_emitida', 'Comentários internos', 'Só administradores veem estes comentários…'),
  ];
}

function painelProcesso(c) {
  return [
    el('div', 'ficha-grade',
      el('div', 'ficha-coluna', blocoEntrega(c), blocoSolicitacao(c)),
      el('div', 'ficha-coluna', blocoArquivos(c, ['cliente'], { titulo: 'Documentos do cliente', icone: 'documento', semEnvio: true }))),
    comentarios(c, 'processo_iniciado', 'Anotações do processo', 'Ex.: conferi os holerites, falta o índice de março…'),
  ];
}

function painelRevisado(c) {
  return [
    comentarios(c, 'revisado', 'O que o cliente pediu para ajustar', 'Ex.: incluir as horas extras de março e refazer o relatório…', { destaque: true }),
  ];
}

function painelEntregue(c) {
  const entregue = c.etapa === 'entregue';
  const registro = entregue ? ultimaEntrega() : null;
  const partes = [];
  if (entregue) {
    partes.push(el('p', 'chamada-entrega is-feita', icone('ok'),
      el('span', '', el('strong', '', 'Entregue'), registro ? ` em ${dataHora(registro.quando)} por ${registro.usuario || 'usuário removido'}.` : ` em ${dataHora(c.atualizado_em)}.`)));
  } else if (podeMoverPara(c, 'entregue')) {
    partes.push(el('p', 'chamada-entrega', icone('enviar'),
      el('span', '', el('strong', '', 'Para concluir: '), 'envie o Excel e o relatório finais, deixe um comentário se quiser e clique em "Concluir e registrar entrega". O dia e a hora ficam registrados.')));
  }
  partes.push(
    blocoArquivos(c, ['entrega'], { titulo: 'Arquivos da entrega', icone: 'documento', aoEnviar: entregue ? null : () => perguntarSeConclui(c) }),
    comentarios(c, 'entregue', 'Comentário da entrega', 'Ex.: entregue por e-mail ao cliente, com o vídeo explicativo…'));
  if (!entregue && podeMoverPara(c, 'entregue')) {
    partes.push(el('div', 'painel-rodape painel-rodape--destaque',
      botao('Concluir e registrar entrega', 'botao--primario', () => concluir(c), { icone: 'ok' })));
  }
  return partes;
}

// Depois de enviar um arquivo final, oferece concluir na hora.
function perguntarSeConclui(c) {
  if (contatoPorId(c.id)?.etapa === 'entregue') return;
  acoes.avisar('Arquivo da entrega anexado.', 'ok', { rotulo: 'Concluir agora', aoClicar: () => concluir(c) });
}

function concluir(c) {
  const finais = dados.arquivos.filter(a => a.categoria === 'entrega').length;
  if (!finais && !eAdmin()) {
    acoes.avisar('Envie pelo menos um arquivo da entrega (o Excel ou o relatório) antes de concluir.', 'erro');
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
  const whatsapp = linkWhatsApp(c);
  const email = linkEmail(c);
  if (whatsapp) barra.append(link('WhatsApp', whatsapp, 'botao botao--whatsapp', { icone: 'whatsapp', novaAba: true, titulo: 'Abrir conversa com mensagem pronta' }));
  if (email) barra.append(link('Responder por e-mail', email, 'botao', { icone: 'email' }));
  if (!eAdmin()) return barra;
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
    el('div', 'campos-lado', campo('WhatsApp', 'telefone', c.telefone, 'tel'), campo('E-mail', 'email', c.email, 'email')),
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

function blocoSolicitacao(c) {
  const campos = [
    ['Plano de interesse', c.plano],
    ['Necessidade', c.descricao],
    ['Atividade a automatizar', c.atividade_manual],
    ['O que deve continuar igual', c.manter_inalterado],
    ['Documentos', c.envio_documentos],
    ['Observações', c.observacoes],
    ['Botão do site', c.chamada],
  ].filter(([, valor]) => valor);
  return el('section', 'bloco', el('div', 'bloco-topo', el('h3', '', 'Solicitação')),
    campos.length
      ? el('dl', 'dados dados--texto', campos.map(([rotulo, valor]) => item(rotulo, valor)))
      : el('p', 'vazio-mini', c.origem === 'site'
        ? 'Este contato chegou antes da Central guardar a ficha completa. Os detalhes estão no e-mail.'
        : 'Nenhum detalhe registrado. Use Editar para completar.'));
}

function item(rotulo, valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  return el('div', 'dado', el('dt', '', rotulo), el('dd', '', valor));
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
  const prazo = c.etapa !== 'entregue' ? situacaoPrazo(c.prazo) : null;
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
  responsavel.append(opcao('', 'Ninguém'));
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
      el('label', 'campo campo--largo', 'Pagamento recebido em', campoData(c.pago_em, data => salvar({ pago_em: data })))),
    c.valor_centavos !== null && c.valor_centavos !== undefined
      ? el('p', `negocio-resumo${c.pago_em ? ' is-pago' : ''}`, icone(c.pago_em ? 'ok' : 'dinheiro'),
        c.pago_em ? `${reais(c.valor_centavos)} recebidos em ${diaBr(c.pago_em)}` : `${reais(c.valor_centavos)} a receber`)
      : null);
}

// Data só é salva completa (o campo do navegador manda 0002, 0020... enquanto se digita o ano).
function campoData(valorAtual, aoMudar) {
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
  return entrada;
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
  const lista = el('ul', 'documentos', el('li', 'carregando', 'Carregando…'));
  lista.dataset.lista = 'arquivos';
  lista.dataset.categorias = visiveis.join(',');
  const partes = [
    el('div', 'bloco-topo', el('h3', 'titulo-icone', icone(opcoes.icone || 'anexo'), opcoes.titulo)),
    opcoes.dica ? el('p', 'bloco-dica', opcoes.dica) : null,
    lista,
  ];
  if (!opcoes.semEnvio && !somenteLeitura(c) && visiveis.length) partes.push(...zonaDeEnvio(c, visiveis, opcoes.aoEnviar));
  return el('section', 'bloco bloco--documentos', partes);
}

function zonaDeEnvio(c, categorias, aoEnviar) {
  const id = `envio-${++sequencia}`;
  const categoria = el('select');
  categoria.setAttribute('aria-label', 'Tipo do arquivo');
  for (const cat of categorias) categoria.append(opcao(cat, CATEGORIAS[cat]));

  const entrada = el('input');
  entrada.type = 'file';
  entrada.accept = '.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.xlsm,.csv,.doc,.docx,.xml,.txt,.zip';
  entrada.className = 'sr';
  entrada.id = id;

  const status = el('p', 'aviso');
  const zona = el('label', 'zona-envio', icone('enviar'),
    el('span', '', el('strong', '', 'Escolha um arquivo'), ' ou arraste para cá'),
    el('small', '', 'PDF, imagem, Excel ou Word · até 10 MB'));
  zona.htmlFor = id;

  const enviar = async arquivo => {
    if (!arquivo) return;
    if (arquivo.size > 10 * 1024 * 1024) { status.textContent = 'O arquivo passa de 10 MB.'; return; }
    status.classList.remove('is-ok');
    status.textContent = `Enviando ${arquivo.name}…`;
    zona.classList.add('is-enviando');
    const corpo = new FormData();
    corpo.append('categoria', categoria.value);
    corpo.append('arquivo', arquivo);
    try {
      const resposta = await fetch(`/api/contatos/${c.id}/arquivos`, { method: 'POST', body: corpo, credentials: 'same-origin' });
      const retorno = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(retorno.erro || 'Não foi possível enviar.');
      status.textContent = `${arquivo.name} anexado.`;
      status.classList.add('is-ok');
      entrada.value = '';
      await depoisDeMudar();
      if (aoEnviar) aoEnviar();
    } catch (e) {
      status.textContent = e.message;
    } finally {
      zona.classList.remove('is-enviando');
    }
  };
  entrada.addEventListener('change', () => enviar(entrada.files[0]));
  zona.addEventListener('dragover', evento => { evento.preventDefault(); zona.classList.add('is-alvo'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('is-alvo'));
  zona.addEventListener('drop', evento => {
    evento.preventDefault();
    zona.classList.remove('is-alvo');
    enviar(evento.dataTransfer.files[0]);
  });
  const tipo = el('label', 'campo', 'Tipo', categoria);
  if (categorias.length === 1) tipo.hidden = true;
  return [el('div', `envio${categorias.length === 1 ? ' envio--simples' : ''}`, tipo, entrada, zona), status];
}

function preencherArquivos() {
  for (const lista of janela().querySelectorAll('[data-lista="arquivos"]')) {
    const categorias = lista.dataset.categorias.split(',');
    const arquivos = dados.arquivos.filter(a => categorias.includes(a.categoria));
    if (!arquivos.length) {
      lista.replaceChildren(el('li', 'vazio-mini', 'Nenhum arquivo ainda.'));
      continue;
    }
    const c = contatoPorId(atualId);
    lista.replaceChildren(...arquivos.map(a => {
      const baixar = el('a', 'documento-nome', icone('documento'), el('span', '', a.nome));
      baixar.href = `/api/arquivos/${a.id}`;
      baixar.download = a.nome;
      baixar.title = `Baixar ${a.nome}`;
      const autor = a.usuario || (a.usuario_id ? 'usuário removido' : 'enviado pelo cliente no site');
      const li = el('li', `documento documento--${a.categoria}`,
        baixar,
        el('span', 'documento-info', el('span', `categoria categoria--${a.categoria}`, CATEGORIAS[a.categoria]),
          `${tamanhoArquivo(a.tamanho)} · ${autor} · ${dataHora(a.criado_em)}`));
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

function comentarios(c, aba, titulo, exemplo, { destaque = false } = {}) {
  const lista = el('ol', 'comentarios', el('li', 'carregando', 'Carregando…'));
  lista.dataset.lista = 'comentarios';
  lista.dataset.aba = aba;
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
    const notas = dados.itens.filter(i => i.tipo === 'nota' && (i.aba || 'entrada') === lista.dataset.aba);
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

function preencher() {
  if (!dados.carregado) return;
  preencherArquivos();
  preencherComentarios();
  preencherHistorico();
  // Na aba Entregue, o registro do dia depende da linha do tempo: redesenha a chamada quando ela chega.
  const chamada = janela().querySelector('.chamada-entrega.is-feita');
  const registro = chamada ? ultimaEntrega() : null;
  if (chamada && registro) chamada.lastChild.replaceChildren(el('strong', '', 'Entregue'), ` em ${dataHora(registro.quando)} por ${registro.usuario || 'usuário removido'}.`);
}
