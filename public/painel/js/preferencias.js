// Preferências da própria conta: apelido, modo noturno e senha.
// O nome completo é definido pelo administrador (em Equipe), que é quem cria os acessos.
import { estado, acoes, eAdmin } from './estado.js';
import { api } from './api.js';
import { el, botao, icone, avatar, nomeExibicao, PAPEIS } from './util.js';

const temaAtual = () => (document.documentElement.dataset.tema === 'claro' ? 'claro' : 'escuro');

// Tema: vem da conta; o navegador guarda uma cópia só para não piscar ao abrir.
export function aplicarTema(tema) {
  const claro = tema === 'claro';
  document.documentElement.dataset.tema = claro ? 'claro' : 'escuro';
  // Botão da barra de cima: mostra para onde vai (sol no escuro, lua no claro).
  const b = document.querySelector('#alternar-tema');
  if (b) {
    b.replaceChildren(icone(claro ? 'lua' : 'sol'));
    b.title = claro ? 'Ativar modo noturno' : 'Ativar modo claro';
    b.setAttribute('aria-label', b.title);
  }
  for (const chave of document.querySelectorAll('.pref-chave input')) chave.checked = !claro;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', claro ? '#f4f6fa' : '#0b1422');
  try { localStorage.setItem('plannex-tema', claro ? 'claro' : 'escuro'); } catch { /* sem armazenamento: tudo bem */ }
}

// Troca o tema na hora e salva na conta; se não salvar, volta ao que era.
export async function trocarTema(tema = temaAtual() === 'claro' ? 'escuro' : 'claro') {
  const anterior = temaAtual();
  aplicarTema(tema);
  try {
    await api('/api/eu', { method: 'PATCH', corpo: { tema } });
    if (estado.usuario) estado.usuario.tema = tema;
  } catch (e) {
    aplicarTema(anterior);
    acoes.avisar(e.message, 'erro');
  }
}

export function temaGuardado() {
  try { return localStorage.getItem('plannex-tema'); } catch { return null; }
}

export function desenharPreferencias(raiz) {
  const u = estado.usuario;
  const cabecalho = el('header', 'tela-topo', el('div', '', el('h1', '', 'Preferências')));
  raiz.replaceChildren(cabecalho,
    el('div', 'preferencias',
      el('div', 'preferencias-lado', blocoConta(u), blocoAparencia(u)),
      el('div', 'preferencias-lado', blocoSenha())));
}

function blocoConta(u) {
  const salvo = el('span', 'salvo', icone('ok'), 'Salvo');
  salvo.hidden = true;

  const apelido = el('input');
  apelido.maxLength = 30;
  apelido.value = u.apelido || '';
  apelido.placeholder = u.nome.split(' ')[0];
  apelido.autocomplete = 'nickname';
  const salvar = botao('Salvar apelido', 'botao--primario botao--pequeno', null);
  const form = el('form', 'pref-apelido', el('label', 'campo', 'Apelido', apelido), salvar);
  salvar.type = 'submit';
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    salvar.disabled = true;
    try {
      await api('/api/eu', { method: 'PATCH', corpo: { apelido: apelido.value.trim() } });
      estado.usuario.apelido = apelido.value.trim() || null;
      salvo.hidden = false;
      setTimeout(() => { salvo.hidden = true; }, 1800);
      acoes.recarregar({ silencioso: true });
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    } finally {
      salvar.disabled = false;
    }
  });

  const nomeCompleto = el('div', 'dado', el('dt', '', 'Nome completo'),
    el('dd', '', u.nome, el('small', 'pref-nota', icone('cadeado'), eAdmin() ? 'Altere em Equipe' : 'Só o administrador altera')));
  return el('section', 'bloco',
    el('div', 'bloco-topo', el('h2', '', 'Conta'), salvo),
    el('div', 'pref-quem', avatar(u.nome, 'avatar--grande'),
      el('div', 'pref-quem-texto', el('strong', '', nomeExibicao(u)),
        el('span', `papel papel--${u.papel}`, icone(u.papel === 'admin' ? 'escudo' : 'usuario'), PAPEIS[u.papel].nome))),
    el('dl', 'dados', nomeCompleto, el('div', 'dado', el('dt', '', 'Usuário'), el('dd', '', `@${u.usuario}`))),
    form);
}

function blocoAparencia(u) {
  const chave = el('input');
  chave.type = 'checkbox';
  chave.setAttribute('role', 'switch');
  chave.checked = temaAtual() === 'escuro';
  chave.addEventListener('change', () => trocarTema(chave.checked ? 'escuro' : 'claro'));
  return el('section', 'bloco',
    el('div', 'bloco-topo', el('h2', '', 'Aparência')),
    el('label', 'pref-chave', el('span', '', icone('lua'), 'Modo noturno'), chave, el('span', 'chave-trilho', el('span', 'chave-bolinha'))));
}

function blocoSenha() {
  const campo = (rotulo, nome, autocomplete) => {
    const entrada = el('input');
    entrada.type = 'password';
    entrada.name = nome;
    entrada.autocomplete = autocomplete;
    entrada.required = true;
    if (nome !== 'atual') entrada.minLength = 10;
    return el('label', 'campo', rotulo, entrada);
  };
  const aviso = el('p', 'aviso');
  aviso.setAttribute('role', 'alert');
  const salvar = botao('Salvar nova senha', 'botao--primario', null, { icone: 'chave' });
  salvar.type = 'submit';
  const form = el('form', 'bloco form-senha-pref',
    el('div', 'bloco-topo', el('h2', '', 'Redefinir senha')),
    campo('Senha atual', 'atual', 'current-password'),
    campo('Nova senha (mín. 10 caracteres)', 'nova', 'new-password'),
    campo('Repita a nova senha', 'repetir', 'new-password'),
    aviso,
    el('div', 'form-acoes', salvar));
  form.noValidate = true;
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    aviso.classList.remove('is-ok');
    const { atual, nova, repetir } = Object.fromEntries(new FormData(form));
    if (!atual) { aviso.textContent = 'Informe a senha atual.'; return; }
    if (nova.length < 10) { aviso.textContent = 'A nova senha precisa ter pelo menos 10 caracteres.'; return; }
    if (nova !== repetir) { aviso.textContent = 'As novas senhas não conferem.'; return; }
    salvar.disabled = true;
    try {
      await api('/api/senha', { method: 'POST', corpo: { atual, nova } });
      form.reset();
      aviso.textContent = 'Senha trocada. As outras sessões abertas foram encerradas.';
      aviso.classList.add('is-ok');
    } catch (e) {
      aviso.textContent = e.message;
    } finally {
      salvar.disabled = false;
    }
  });
  return form;
}
