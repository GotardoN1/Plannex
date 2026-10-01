'use strict';
// Painel interno da Plannex: caixa de entrada dos contatos do site e andamento por etapas.
// Os nomes vêm de um formulário público, então tudo é montado com textContent, nunca innerHTML.

const ETAPAS = [
  ['pedido', 'Pedido'],
  ['nota_emitida', 'Nota emitida'],
  ['pagamento_efetuado', 'Pagamento efetuado'],
  ['processo_iniciado', 'Processo iniciado'],
  ['revisado', 'Revisado'],
  ['concluido', 'Concluído'],
  ['entregue', 'Entregue'],
];
const NOME_ETAPA = Object.fromEntries(ETAPAS);
const NOME_SERVICO = { calculos: 'Cálculos', automacao: 'Automação' };
const CAIXA = 'Caixa de entrada';

const $ = seletor => document.querySelector(seletor);
const $$ = seletor => [...document.querySelectorAll(seletor)];

const estado = {
  contatos: [],
  aba: 'entrada',
  servico: '',
  busca: '',
  soNovos: false,
  contatoAberto: null,
};

// ---------- API ----------

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, {
    method: opcoes.method || 'GET',
    headers: opcoes.corpo ? { 'Content-Type': 'application/json' } : {},
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const dados = await resposta.json().catch(() => ({}));
  if (resposta.status === 401 && !opcoes.semRedirecionar) {
    mostrarLogin();
    throw new Error(dados.erro || 'Sessão expirada.');
  }
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir. Tente novamente.');
  return dados;
}

// ---------- Utilitários ----------

function el(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function botao(texto, classe, aoClicar, titulo) {
  const b = el('button', `botao botao--pequeno ${classe || ''}`.trim(), texto);
  b.type = 'button';
  if (titulo) {
    b.title = titulo;
    b.setAttribute('aria-label', titulo);
  }
  b.addEventListener('click', aoClicar);
  return b;
}

const formatoData = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
function data(iso) {
  return iso ? formatoData.format(new Date(iso)).replace(',', ' às') : '';
}

function etiquetaServico(servico) {
  return el('span', `servico servico--${servico}`, NOME_SERVICO[servico] || servico);
}

function mostrarErro(mensagem) {
  const aviso = $('#erro-geral');
  aviso.textContent = mensagem;
  aviso.hidden = !mensagem;
}

// ---------- Telas ----------

function mostrarLogin() {
  $('#tela-app').hidden = true;
  $('#tela-login').hidden = false;
  $('#login-usuario').focus();
}

function mostrarApp(usuario) {
  $('#usuario-nome').textContent = usuario.nome;
  $('#tela-login').hidden = true;
  $('#tela-app').hidden = false;
}

async function iniciar() {
  try {
    const { usuario } = await api('/api/sessao', { semRedirecionar: true });
    mostrarApp(usuario);
    await carregar();
  } catch {
    mostrarLogin();
  }
}

$('#form-login').addEventListener('submit', async evento => {
  evento.preventDefault();
  const erro = $('#login-erro');
  const enviar = $('#login-botao');
  const usuario = $('#login-usuario').value.trim();
  const senha = $('#login-senha').value;
  if (!usuario || !senha) {
    erro.textContent = 'Informe usuário e senha.';
    return;
  }
  erro.textContent = '';
  enviar.disabled = true;
  try {
    await api('/api/login', { method: 'POST', corpo: { usuario, senha }, semRedirecionar: true });
    $('#login-senha').value = '';
    await iniciar();
  } catch (e) {
    erro.textContent = e.message;
  } finally {
    enviar.disabled = false;
  }
});

$('#sair').addEventListener('click', async () => {
  await api('/api/sair', { method: 'POST', semRedirecionar: true }).catch(() => {});
  estado.contatos = [];
  mostrarLogin();
});

// ---------- Dados ----------

async function carregar() {
  const { contatos } = await api('/api/contatos');
  estado.contatos = contatos;
  mostrarErro('');
  desenhar();
}

async function mover(id, etapa) {
  const contato = estado.contatos.find(c => c.id === id);
  if (!contato || contato.etapa === etapa) return;
  const anterior = { etapa: contato.etapa, atualizado_em: contato.atualizado_em };
  // Mostra a mudança na hora; se o servidor recusar, desfaz.
  contato.etapa = etapa;
  contato.atualizado_em = new Date().toISOString();
  desenhar();
  try {
    await api(`/api/contatos/${id}`, { method: 'PATCH', corpo: { etapa } });
  } catch (e) {
    Object.assign(contato, anterior);
    desenhar();
    mostrarErro(e.message);
  }
}

function filtrados() {
  const busca = estado.busca.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return estado.contatos.filter(c =>
    (!estado.servico || c.servico === estado.servico) &&
    (!busca || c.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(busca))
  );
}

// ---------- Desenho ----------

function desenhar() {
  const lista = filtrados();
  $('#total-entrada').textContent = estado.contatos.length;
  $('#total-andamento').textContent = estado.contatos.filter(c => c.etapa).length;
  $('#filtro-novos-rotulo').hidden = estado.aba !== 'entrada';
  desenharEntrada(estado.soNovos ? lista.filter(c => !c.etapa) : lista);
  desenharQuadro(lista.filter(c => c.etapa));
}

function desenharEntrada(contatos) {
  const ul = $('#lista-entrada');
  ul.replaceChildren(...contatos.map(contato => {
    const li = el('li', `linha${contato.etapa ? '' : ' is-nova'}`);
    const texto = el('div', 'linha-texto');
    texto.append(el('div', 'linha-nome', contato.nome), el('div', 'linha-data', data(contato.criado_em)));
    const etapa = el('span', `etapa-atual${contato.etapa === 'entregue' ? ' etapa-atual--entregue' : ''}`,
      contato.etapa ? NOME_ETAPA[contato.etapa] : 'Novo');
    const acoes = el('div', 'linha-acoes');
    if (!contato.etapa) acoes.append(botao('Mover para Pedido', 'botao--primario', () => mover(contato.id, 'pedido')));
    acoes.append(botao('Histórico', 'botao--fantasma', () => abrirHistorico(contato)));
    li.append(etiquetaServico(contato.servico), texto, etapa, acoes);
    return li;
  }));
  $('#vazio-entrada').hidden = contatos.length > 0;
}

function desenharQuadro(contatos) {
  const quadro = $('#quadro');
  quadro.replaceChildren(...ETAPAS.map(([chave, nome], indice) => {
    const daEtapa = contatos.filter(c => c.etapa === chave)
      .sort((a, b) => String(b.atualizado_em).localeCompare(String(a.atualizado_em)));

    const coluna = el('section', `coluna coluna--${chave}`);
    coluna.dataset.etapa = chave;
    coluna.setAttribute('aria-label', nome);

    const topo = el('header', 'coluna-topo');
    const titulo = el('span');
    titulo.append(el('span', 'coluna-passo', String(indice + 1)), document.createTextNode(nome));
    topo.append(titulo, el('span', 'coluna-numero', String(daEtapa.length)));

    const cartoes = el('div', 'coluna-cartoes');
    if (!daEtapa.length) cartoes.append(el('p', 'coluna-vazia', 'Nada nesta etapa.'));
    for (const contato of daEtapa) cartoes.append(cartao(contato, indice));

    coluna.append(topo, cartoes);
    prepararSoltar(coluna);
    return coluna;
  }));
}

function cartao(contato, indice) {
  const artigo = el('article', 'cartao');
  artigo.draggable = true;
  artigo.dataset.id = contato.id;
  artigo.addEventListener('dragstart', evento => {
    evento.dataTransfer.setData('text/plain', String(contato.id));
    evento.dataTransfer.effectAllowed = 'move';
    artigo.classList.add('is-arrastando');
  });
  artigo.addEventListener('dragend', () => artigo.classList.remove('is-arrastando'));

  const datas = el('div', 'cartao-datas');
  datas.append(el('div', '', `Chegou em ${data(contato.criado_em)}`));
  if (contato.atualizado_em) datas.append(el('div', '', `Nesta etapa desde ${data(contato.atualizado_em)}`));

  const anterior = indice > 0 ? ETAPAS[indice - 1] : null;
  const proxima = ETAPAS[indice + 1];
  const acoes = el('div', 'cartao-acoes');
  acoes.append(botao('←', 'botao--icone', () => mover(contato.id, anterior ? anterior[0] : null),
    `Voltar para ${anterior ? anterior[1] : CAIXA}`));
  if (proxima) acoes.append(botao('→', 'botao--icone botao--primario', () => mover(contato.id, proxima[0]), `Avançar para ${proxima[1]}`));
  acoes.append(botao('Histórico', 'botao--fantasma botao--historico', () => abrirHistorico(contato)));

  artigo.append(etiquetaServico(contato.servico), el('div', 'cartao-nome', contato.nome), datas, acoes);
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
    if (id) mover(id, coluna.dataset.etapa);
  });
}

// ---------- Histórico e exclusão ----------

async function abrirHistorico(contato) {
  estado.contatoAberto = contato;
  const janela = $('#janela-historico');
  $('#historico-titulo').textContent = contato.nome;
  const lista = $('#historico-lista');
  lista.replaceChildren(el('li', '', 'Carregando…'));
  janela.showModal();

  const chegada = el('li');
  chegada.append(el('time', '', data(contato.criado_em)),
    document.createTextNode(`Chegou pelo site · ${NOME_SERVICO[contato.servico]}`));
  try {
    const { movimentacoes } = await api(`/api/contatos/${contato.id}/movimentacoes`);
    lista.replaceChildren(chegada, ...movimentacoes.map(m => {
      const li = el('li');
      const quem = m.usuario || 'Usuário removido';
      li.append(el('time', '', data(m.quando)),
        document.createTextNode(`${quem} moveu de ${m.de ? NOME_ETAPA[m.de] : CAIXA} para ${m.para ? NOME_ETAPA[m.para] : CAIXA}`));
      return li;
    }));
  } catch (e) {
    lista.replaceChildren(chegada, el('li', 'aviso', e.message));
  }
}

$('#historico-excluir').addEventListener('click', () => {
  const contato = estado.contatoAberto;
  if (!contato) return;
  $('#janela-historico').close();
  $('#excluir-texto').textContent =
    `${contato.nome} (${NOME_SERVICO[contato.servico]}, ${data(contato.criado_em)}) sai da caixa de entrada e do andamento. Não dá para desfazer. O e-mail recebido continua na caixa de e-mail.`;
  $('#janela-excluir').showModal();
});

$('#excluir-confirmar').addEventListener('click', async () => {
  const contato = estado.contatoAberto;
  $('#janela-excluir').close();
  if (!contato) return;
  try {
    await api(`/api/contatos/${contato.id}`, { method: 'DELETE' });
    estado.contatos = estado.contatos.filter(c => c.id !== contato.id);
    desenhar();
  } catch (e) {
    mostrarErro(e.message);
  }
});

// ---------- Trocar senha ----------

$('#abrir-senha').addEventListener('click', () => {
  $('#form-senha').reset();
  $('#senha-aviso').textContent = '';
  $('#senha-aviso').classList.remove('is-ok');
  $('#janela-senha').showModal();
});
$('#senha-cancelar').addEventListener('click', () => $('#janela-senha').close());

$('#form-senha').addEventListener('submit', async evento => {
  evento.preventDefault();
  const aviso = $('#senha-aviso');
  aviso.classList.remove('is-ok');
  const atual = $('#senha-atual').value;
  const nova = $('#senha-nova').value;
  if (nova.length < 10) return void (aviso.textContent = 'A nova senha precisa ter pelo menos 10 caracteres.');
  if (nova !== $('#senha-repetir').value) return void (aviso.textContent = 'As novas senhas não conferem.');
  try {
    await api('/api/senha', { method: 'POST', corpo: { atual, nova } });
    aviso.textContent = 'Senha trocada. As outras sessões abertas foram encerradas.';
    aviso.classList.add('is-ok');
    setTimeout(() => $('#janela-senha').close(), 1600);
  } catch (e) {
    aviso.textContent = e.message;
  }
});

// ---------- Filtros e abas ----------

for (const aba of $$('.aba')) {
  aba.addEventListener('click', () => {
    estado.aba = aba.dataset.aba;
    for (const outra of $$('.aba')) outra.setAttribute('aria-pressed', String(outra === aba));
    $('#aba-entrada').hidden = estado.aba !== 'entrada';
    $('#aba-andamento').hidden = estado.aba !== 'andamento';
    desenhar();
  });
}

for (const filtro of $$('.filtro')) {
  filtro.addEventListener('click', () => {
    estado.servico = filtro.dataset.servico;
    for (const outro of $$('.filtro')) outro.setAttribute('aria-pressed', String(outro === filtro));
    desenhar();
  });
}

$('#busca').addEventListener('input', evento => {
  estado.busca = evento.target.value.trim();
  desenhar();
});

$('#filtro-novos').addEventListener('change', evento => {
  estado.soNovos = evento.target.checked;
  desenhar();
});

$('#atualizar').addEventListener('click', () => carregar().catch(e => mostrarErro(e.message)));

// Atualiza sozinho a cada minuto, se a aba estiver visível e nenhuma janela aberta.
setInterval(() => {
  if (document.hidden || $('#tela-app').hidden || document.querySelector('dialog[open]')) return;
  carregar().catch(() => {});
}, 60000);

iniciar();
