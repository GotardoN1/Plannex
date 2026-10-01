// Central Plannex: login, navegação, busca, recarga automática e as ações compartilhadas.
import { api, quandoExpirar } from './api.js';
import { estado, acoes, contatoPorId, eAdmin } from './estado.js';
import { el, botao, icone, avatar, etiquetaServico, NOME_ETAPA, CAIXA, normalizar, textoBusca, relativo, primeiroNome } from './util.js';
import { desenharVisao } from './visao.js';
import { desenharEntrada } from './entrada.js';
import { desenharQuadro } from './quadro.js';
import { desenharAgenda } from './agenda.js';
import { desenharEquipe } from './equipe.js';
import { abrirFicha, atualizarFicha, fichaAberta } from './ficha.js';
import { abrirNovo } from './novo.js';

const $ = seletor => document.querySelector(seletor);
const $$ = seletor => [...document.querySelectorAll(seletor)];

// "admin: true": só administrador vê. O funcionário fica com as demandas dele e a agenda.
const TELAS = {
  visao: { titulo: 'Visão geral', desenhar: desenharVisao, admin: true },
  entrada: { titulo: 'Caixa de entrada', desenhar: desenharEntrada },
  andamento: { titulo: 'Andamento', desenhar: desenharQuadro, admin: true },
  agenda: { titulo: 'Agenda', desenhar: desenharAgenda },
  arquivo: { titulo: 'Arquivo', desenhar: raiz => desenharEntrada(raiz, { arquivo: true }), admin: true },
  equipe: { titulo: 'Equipe', desenhar: desenharEquipe, admin: true },
};
const podeVer = nome => Boolean(TELAS[nome]) && (!TELAS[nome].admin || eAdmin());
const telaInicial = () => (eAdmin() ? 'visao' : 'entrada');
const RECARGA_MS = 45000;

let telaAtual = 'visao';
let idsConhecidos = null;
let redesenhoPendente = false;

// ---------- Telas ----------

function telaDoEndereco() {
  const nome = location.hash.replace(/^#\/?/, '');
  return podeVer(nome) ? nome : telaInicial();
}

function navegar(nome) {
  if (location.hash !== `#/${nome}`) location.hash = `#/${nome}`;
  else mostrarTela(nome);
}

function mostrarTela(nome) {
  if (!podeVer(nome)) nome = telaInicial();
  telaAtual = nome;
  for (const b of $$('[data-tela]')) {
    if (b.dataset.tela === nome) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  desenharTela();
  $('#tela').scrollTop = 0;
  window.scrollTo(0, 0);
}

function desenharTela() {
  redesenhoPendente = false;
  if (!podeVer(telaAtual)) telaAtual = telaInicial();
  TELAS[telaAtual].desenhar($('#tela'));
  atualizarContadores();
}

// Com alguém digitando num filtro, o redesenho espera o campo perder o foco.
function redesenharQuandoPuder() {
  const ativo = document.activeElement;
  if (ativo && $('#tela').contains(ativo) && ativo.matches('input, textarea, select')) {
    redesenhoPendente = true;
    atualizarContadores();
    return;
  }
  desenharTela();
}

function atualizarContadores() {
  const ativos = estado.contatos.filter(c => !c.arquivado_em);
  const naoLidos = ativos.filter(c => !c.lido_em).length;
  const contagens = {
    entrada: naoLidos || '',
    andamento: ativos.filter(c => c.etapa && c.etapa !== 'entregue').length || '',
  };
  for (const [tela, valor] of Object.entries(contagens)) {
    for (const b of $$(`[data-tela="${tela}"] .nav-contagem`)) {
      b.textContent = String(valor);
      b.classList.toggle('is-novo', tela === 'entrada' && naoLidos > 0);
    }
  }
  document.title = `${naoLidos ? `(${naoLidos}) ` : ''}Central Plannex`;
  $('#atualizado').textContent = estado.atualizadoEm ? `Atualizado ${relativo(estado.atualizadoEm)}` : '';
}

// ---------- Dados ----------

async function recarregar({ silencioso = false } = {}) {
  try {
    const dados = await api('/api/central');
    const admin = dados.usuario.papel === 'admin';
    const novos = idsConhecidos ? dados.contatos.filter(c => !idsConhecidos.has(c.id) && (!admin || c.origem === 'site')) : [];
    Object.assign(estado, { usuario: dados.usuario, contatos: dados.contatos, usuarios: dados.usuarios, recentes: dados.recentes, atualizadoEm: new Date().toISOString() });
    idsConhecidos = new Set(dados.contatos.map(c => c.id));
    mostrarUsuario();
    redesenharQuandoPuder();
    atualizarFicha();
    for (const c of novos.slice(0, 3)) {
      const servico = c.servico === 'calculos' ? 'Cálculos' : 'Automação';
      avisar(admin ? `Novo contato: ${c.nome} (${servico})` : `Nova demanda para você: ${c.nome} (${servico})`, 'novo', { rotulo: 'Abrir', aoClicar: () => abrirFicha(c.id) });
    }
    if (novos.length > 3) avisar(`E mais ${novos.length - 3} contatos novos na caixa de entrada.`, 'novo');
    return true;
  } catch (e) {
    console.error(e);
    if (!silencioso && estado.usuario) avisar(e.message, 'erro');
    return false;
  }
}

// Aplica a mudança na hora e confirma no servidor; se falhar, volta ao que o servidor tem.
async function alterar(id, campos, mensagem, desfazer) {
  const contato = contatoPorId(id);
  if (contato) {
    const local = { ...campos };
    if ('lido' in local) { local.lido_em = local.lido ? (contato.lido_em || new Date().toISOString()) : null; delete local.lido; }
    if ('arquivado' in local) { local.arquivado_em = local.arquivado ? new Date().toISOString() : null; delete local.arquivado; }
    if ('etapa' in local) local.atualizado_em = new Date().toISOString();
    if (local.dados) { Object.assign(local, local.dados); delete local.dados; }
    Object.assign(contato, local);
    redesenharQuandoPuder();
  }
  try {
    await api(`/api/contatos/${id}`, { method: 'PATCH', corpo: campos });
    if (mensagem) avisar(mensagem, 'ok', desfazer);
    recarregar({ silencioso: true });
    return true;
  } catch (e) {
    avisar(e.message, 'erro');
    await recarregar({ silencioso: true });
    return false;
  }
}

function mover(id, etapa) {
  const contato = contatoPorId(id);
  if (!contato || (contato.etapa || null) === etapa) return;
  const anterior = contato.etapa || null;
  return alterar(id, { etapa }, `${primeiroNome(contato.nome)} → ${etapa ? NOME_ETAPA[etapa] : CAIXA}`,
    { rotulo: 'Desfazer', aoClicar: () => alterar(id, { etapa: anterior }, 'Desfeito.') });
}

Object.assign(acoes, { abrirFicha, alterar, mover, recarregar, navegar, avisar, novoContato: abrirNovo });

// ---------- Avisos ----------

function avisar(texto, tipo = 'ok', acao) {
  const aviso = el('div', `aviso-flutuante aviso-flutuante--${tipo}`,
    icone(tipo === 'erro' ? 'alerta' : tipo === 'novo' ? 'chegada' : 'ok'), el('span', '', texto));
  if (acao) {
    aviso.append(botao(acao.rotulo, 'botao--fantasma botao--pequeno', () => { aviso.remove(); acao.aoClicar(); }));
  }
  const fechar = botao('', 'botao--icone botao--fantasma botao--pequeno', () => aviso.remove(), { icone: 'fechar', titulo: 'Fechar aviso' });
  aviso.append(fechar);
  $('#avisos').append(aviso);
  while ($('#avisos').children.length > 4) $('#avisos').firstElementChild.remove();
  setTimeout(() => aviso.remove(), tipo === 'novo' ? 12000 : tipo === 'erro' ? 8000 : 5000);
}

// ---------- Login ----------

function mostrarLogin() {
  $('#tela-app').hidden = true;
  $('#tela-login').hidden = false;
  for (const d of $$('dialog[open]')) d.close();
  $('#login-usuario').focus();
}

function mostrarUsuario() {
  const admin = eAdmin();
  $('#usuario-avatar').replaceChildren(avatar(estado.usuario.nome));
  $('#usuario-nome').textContent = estado.usuario.nome;
  $('#usuario-login').textContent = admin ? 'Administrador' : 'Funcionário';
  // Menu conforme o acesso.
  for (const b of $$('[data-tela]')) b.hidden = !podeVer(b.dataset.tela);
  $('[data-tela="entrada"] .nav-rotulo').textContent = admin ? 'Caixa de entrada' : 'Minhas demandas';
  $('#novo-contato').hidden = !admin;
  $('.marca').href = `#/${telaInicial()}`;
}

async function entrar() {
  const ok = await recarregar({ silencioso: true });
  if (!ok) { mostrarLogin(); return; }
  $('#tela-login').hidden = true;
  $('#tela-app').hidden = false;
  mostrarTela(telaDoEndereco());
}

quandoExpirar(mostrarLogin);

$('#form-login').addEventListener('submit', async evento => {
  evento.preventDefault();
  const erro = $('#login-erro');
  const enviar = $('#login-botao');
  const usuario = $('#login-usuario').value.trim();
  const senha = $('#login-senha').value;
  if (!usuario || !senha) { erro.textContent = 'Informe usuário e senha.'; return; }
  erro.textContent = '';
  enviar.disabled = true;
  try {
    await api('/api/login', { method: 'POST', corpo: { usuario, senha }, semRedirecionar: true });
    $('#login-senha').value = '';
    await entrar();
  } catch (e) {
    erro.textContent = e.message;
  } finally {
    enviar.disabled = false;
  }
});

$('#sair').addEventListener('click', async () => {
  await api('/api/sair', { method: 'POST', semRedirecionar: true }).catch(() => {});
  Object.assign(estado, { usuario: null, contatos: [], usuarios: [], recentes: [] });
  idsConhecidos = null;
  mostrarLogin();
});

// ---------- Busca global ----------

const busca = $('#busca-global');
const resultados = $('#busca-resultados');
let selecionado = 0;

function buscar() {
  const termo = normalizar(busca.value.trim());
  if (!termo) { resultados.hidden = true; return; }
  const achados = estado.contatos.filter(c => textoBusca(c).includes(termo)).slice(0, 8);
  selecionado = 0;
  resultados.replaceChildren(...(achados.length ? achados.map((c, i) => {
    const item = el('li', '', el('button', 'resultado',
      avatar(c.nome, 'avatar--pequeno'),
      el('span', 'resultado-texto', el('strong', '', c.nome), el('small', '', [c.email, c.telefone].filter(Boolean).join(' · ') || relativo(c.criado_em))),
      etiquetaServico(c.servico),
      el('span', 'etapa-pill', c.arquivado_em ? 'Arquivado' : c.etapa ? NOME_ETAPA[c.etapa] : 'Aguardando')));
    item.id = `resultado-${i}`;
    item.setAttribute('role', 'option');
    item.firstChild.type = 'button';
    item.firstChild.tabIndex = -1;
    item.firstChild.addEventListener('mousedown', evento => evento.preventDefault());
    item.firstChild.addEventListener('click', () => escolher(c.id));
    return item;
  }) : [el('li', 'resultado-vazio', 'Nenhum contato encontrado.')]));
  resultados.hidden = false;
  marcarSelecionado();
}

function marcarSelecionado() {
  const itens = [...resultados.querySelectorAll('li[role="option"]')];
  itens.forEach((item, i) => item.setAttribute('aria-selected', String(i === selecionado)));
  busca.setAttribute('aria-activedescendant', itens[selecionado]?.id || '');
}

function escolher(id) {
  busca.value = '';
  resultados.hidden = true;
  busca.blur();
  abrirFicha(id);
}

busca.addEventListener('input', buscar);
busca.addEventListener('focus', buscar);
busca.addEventListener('blur', () => { setTimeout(() => { resultados.hidden = true; }, 120); });
busca.addEventListener('keydown', evento => {
  const itens = [...resultados.querySelectorAll('li[role="option"]')];
  if (evento.key === 'ArrowDown') { selecionado = Math.min(itens.length - 1, selecionado + 1); marcarSelecionado(); evento.preventDefault(); }
  if (evento.key === 'ArrowUp') { selecionado = Math.max(0, selecionado - 1); marcarSelecionado(); evento.preventDefault(); }
  if (evento.key === 'Enter' && itens[selecionado]) { itens[selecionado].firstChild.click(); evento.preventDefault(); }
  if (evento.key === 'Escape') { busca.value = ''; resultados.hidden = true; busca.blur(); }
});

// Atalhos: "/" busca, "n" novo contato.
document.addEventListener('keydown', evento => {
  if ($('#tela-app').hidden || document.querySelector('dialog[open]')) return;
  if (evento.target.matches('input, textarea, select') || evento.ctrlKey || evento.metaKey || evento.altKey) return;
  if (evento.key === '/') { evento.preventDefault(); busca.focus(); }
  if (evento.key === 'n' && eAdmin()) { evento.preventDefault(); abrirNovo(); }
});

// ---------- Eventos gerais ----------

for (const b of $$('[data-icone]')) b.prepend(icone(b.dataset.icone));
for (const b of $$('[data-tela]')) b.addEventListener('click', () => navegar(b.dataset.tela));
$('#novo-contato').addEventListener('click', () => abrirNovo());
$('#minha-senha').addEventListener('click', () => {
  $('#form-minha-senha').reset();
  $('#senha-aviso').textContent = '';
  $('#senha-aviso').classList.remove('is-ok');
  $('#janela-senha').showModal();
});
$('#senha-cancelar').addEventListener('click', () => $('#janela-senha').close());
$('#form-minha-senha').addEventListener('submit', async evento => {
  evento.preventDefault();
  const aviso = $('#senha-aviso');
  aviso.classList.remove('is-ok');
  const { atual, nova, repetir } = Object.fromEntries(new FormData(evento.target));
  if (nova.length < 10) { aviso.textContent = 'A nova senha precisa ter pelo menos 10 caracteres.'; return; }
  if (nova !== repetir) { aviso.textContent = 'As novas senhas não conferem.'; return; }
  try {
    await api('/api/senha', { method: 'POST', corpo: { atual, nova } });
    $('#janela-senha').close();
    avisar('Senha trocada. Suas outras sessões abertas foram encerradas.');
  } catch (e) {
    aviso.textContent = e.message;
  }
});
$('#atualizar').addEventListener('click', async () => {
  $('#atualizar').classList.add('is-girando');
  await recarregar();
  $('#atualizar').classList.remove('is-girando');
});

window.addEventListener('hashchange', () => { if (!$('#tela-app').hidden) mostrarTela(telaDoEndereco()); });
$('#tela').addEventListener('focusout', () => { setTimeout(() => { if (redesenhoPendente) redesenharQuandoPuder(); }, 0); });

// Fecha a ficha e o cadastro clicando fora.
for (const janela of [$('#ficha'), $('#novo'), $('#janela-senha')]) {
  janela.addEventListener('click', evento => { if (evento.target === janela) janela.close(); });
}
$('#ficha').addEventListener('close', () => { if (!fichaAberta()) redesenharQuandoPuder(); });

setInterval(() => {
  if (document.hidden || $('#tela-app').hidden) return;
  recarregar({ silencioso: true });
}, RECARGA_MS);
setInterval(atualizarContadores, 30000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !$('#tela-app').hidden) recarregar({ silencioso: true });
});

entrar();
