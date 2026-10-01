// Equipe: quem acessa a Central, novos acessos, senha provisória e a própria senha.
import { estado, acoes, ativos } from './estado.js';
import { api } from './api.js';
import { el, botao, avatar, dataCurta } from './util.js';

export function desenharEquipe(raiz) {
  const cabecalho = el('header', 'tela-topo',
    el('div', '',
      el('h1', '', 'Equipe'),
      el('p', '', 'Quem acessa a Central. Cada pessoa entra com o próprio usuário e senha, e o histórico mostra quem fez o quê.')));

  const lista = el('ul', 'equipe', estado.usuarios.map(u => pessoa(u)));
  raiz.replaceChildren(cabecalho,
    el('div', 'equipe-grade',
      el('section', 'bloco', el('div', 'bloco-topo', el('h2', '', `Pessoas (${estado.usuarios.length})`)), lista),
      el('div', 'equipe-lado', formularioNovo(), minhaSenha())));
}

function pessoa(u) {
  const voce = u.id === estado.usuario.id;
  const comEla = ativos().filter(c => c.responsavel_id === u.id && c.etapa !== 'entregue').length;
  const li = el('li', 'pessoa',
    avatar(u.nome, 'avatar--medio'),
    el('div', 'pessoa-texto',
      el('strong', '', u.nome, voce ? el('span', 'voce', 'você') : null),
      el('span', '', `@${u.usuario} · desde ${dataCurta(u.criado_em)} · ${comEla} ${comEla === 1 ? 'contato ativo' : 'contatos ativos'} sob responsabilidade`)));
  if (voce) return li;

  const acoesPessoa = el('div', 'pessoa-acoes');
  const formSenha = el('form', 'pessoa-senha');
  formSenha.hidden = true;
  const campo = el('input');
  campo.type = 'password';
  campo.autocomplete = 'new-password';
  campo.minLength = 10;
  campo.placeholder = 'Senha provisória (mín. 10)';
  campo.setAttribute('aria-label', `Nova senha para ${u.nome}`);
  formSenha.append(campo, botao('Salvar', 'botao--primario botao--pequeno', null));
  formSenha.querySelector('button').type = 'submit';
  formSenha.addEventListener('submit', async evento => {
    evento.preventDefault();
    try {
      await api(`/api/usuarios/${u.id}/senha`, { method: 'POST', corpo: { senha: campo.value } });
      acoes.avisar(`Senha de ${u.nome} redefinida. Passe a senha por um canal seguro; ${u.nome.split(' ')[0]} pode trocá-la depois.`);
      formSenha.hidden = true;
      campo.value = '';
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    }
  });

  const remover = botao('Remover acesso', 'botao--perigo botao--pequeno', null);
  let confirmando = false;
  remover.addEventListener('click', async () => {
    if (!confirmando) {
      confirmando = true;
      remover.querySelector('span').textContent = 'Confirmar remoção';
      setTimeout(() => { confirmando = false; if (remover.isConnected) remover.querySelector('span').textContent = 'Remover acesso'; }, 4000);
      return;
    }
    try {
      await api(`/api/usuarios/${u.id}`, { method: 'DELETE' });
      acoes.avisar(`${u.nome} não acessa mais a Central. O histórico do que fez continua.`);
      acoes.recarregar();
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    }
  });

  acoesPessoa.append(
    botao('Redefinir senha', 'botao--fantasma botao--pequeno', () => { formSenha.hidden = !formSenha.hidden; if (!formSenha.hidden) campo.focus(); }, { icone: 'chave' }),
    remover);
  li.append(acoesPessoa, formSenha);
  return li;
}

function formularioNovo() {
  const form = el('form', 'bloco form-equipe');
  const campo = (rotulo, nome, tipo, extras = {}) => {
    const entrada = el('input');
    entrada.name = nome;
    entrada.type = tipo;
    entrada.required = true;
    Object.assign(entrada, extras);
    return el('label', 'campo', rotulo, entrada);
  };
  const aviso = el('p', 'aviso');
  form.append(
    el('div', 'bloco-topo', el('h2', '', 'Dar acesso a alguém')),
    campo('Nome', 'nome', 'text', { autocomplete: 'off', maxLength: 80, placeholder: 'Ex.: Maria Souza' }),
    campo('Usuário (para entrar)', 'usuario', 'text', { autocomplete: 'off', maxLength: 60, placeholder: 'Ex.: maria', autocapitalize: 'none', spellcheck: false }),
    campo('Senha provisória', 'senha', 'password', { autocomplete: 'new-password', minLength: 10, placeholder: 'Mínimo de 10 caracteres' }),
    aviso,
    el('div', 'form-acoes', botao('Criar acesso', 'botao--primario', null, { icone: 'mais' })));
  form.querySelector('.form-acoes button').type = 'submit';
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    aviso.textContent = '';
    const dados = Object.fromEntries(new FormData(form));
    try {
      await api('/api/usuarios', { method: 'POST', corpo: dados });
      acoes.avisar(`${dados.nome} já pode entrar com o usuário "${dados.usuario.toLowerCase()}".`);
      form.reset();
      acoes.recarregar();
    } catch (e) {
      aviso.textContent = e.message;
    }
  });
  return form;
}

function minhaSenha() {
  const form = el('form', 'bloco form-equipe');
  const entrada = (rotulo, nome, autocomplete) => {
    const i = el('input');
    i.type = 'password';
    i.name = nome;
    i.required = true;
    i.autocomplete = autocomplete;
    return el('label', 'campo', rotulo, i);
  };
  const aviso = el('p', 'aviso');
  form.append(
    el('div', 'bloco-topo', el('h2', '', 'Trocar minha senha')),
    entrada('Senha atual', 'atual', 'current-password'),
    entrada('Nova senha (mín. 10 caracteres)', 'nova', 'new-password'),
    entrada('Repita a nova senha', 'repetir', 'new-password'),
    aviso,
    el('div', 'form-acoes', botao('Salvar nova senha', 'botao--primario', null, { icone: 'chave' })));
  form.querySelector('.form-acoes button').type = 'submit';
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    aviso.classList.remove('is-ok');
    const { atual, nova, repetir } = Object.fromEntries(new FormData(form));
    if (nova.length < 10) { aviso.textContent = 'A nova senha precisa ter pelo menos 10 caracteres.'; return; }
    if (nova !== repetir) { aviso.textContent = 'As novas senhas não conferem.'; return; }
    try {
      await api('/api/senha', { method: 'POST', corpo: { atual, nova } });
      form.reset();
      aviso.textContent = 'Senha trocada. Suas outras sessões abertas foram encerradas.';
      aviso.classList.add('is-ok');
    } catch (e) {
      aviso.textContent = e.message;
    }
  });
  return form;
}

