// Equipe (só administrador): quem acessa a Central, tipo de acesso, novos acessos e senha provisória.
import { estado, acoes, ativos } from './estado.js';
import { api } from './api.js';
import { el, botao, icone, avatar, dataCurta, PAPEIS } from './util.js';

export function desenharEquipe(raiz) {
  const cabecalho = el('header', 'tela-topo',
    el('div', '',
      el('h1', '', 'Equipe'),
      el('p', '', 'Quem acessa a Central e o que cada um vê. Cada pessoa entra com o próprio usuário e senha, e o histórico mostra quem fez o quê.')));

  const admins = estado.usuarios.filter(u => u.papel === 'admin');
  const funcionarios = estado.usuarios.filter(u => u.papel !== 'admin');
  const grupo = (titulo, pessoas) => el('section', 'bloco',
    el('div', 'bloco-topo', el('h2', '', `${titulo} (${pessoas.length})`)),
    pessoas.length ? el('ul', 'equipe', pessoas.map(pessoa)) : el('p', 'vazio-mini', 'Ninguém com este acesso ainda.'));

  raiz.replaceChildren(cabecalho,
    el('div', 'equipe-grade',
      el('div', 'equipe-lado', grupo('Administradores', admins), grupo('Funcionários', funcionarios)),
      el('div', 'equipe-lado', formularioNovo(), explicacao())));
}

function pessoa(u) {
  const voce = u.id === estado.usuario.id;
  const comEla = ativos().filter(c => c.responsavel_id === u.id && c.etapa !== 'entregue').length;
  const li = el('li', 'pessoa',
    avatar(u.nome, 'avatar--medio'),
    el('div', 'pessoa-texto',
      el('strong', '', u.nome, voce ? el('span', 'voce', 'você') : null),
      el('span', '', `@${u.usuario} · desde ${dataCurta(u.criado_em)} · ${comEla} ${comEla === 1 ? 'demanda ativa' : 'demandas ativas'}`)));
  if (voce) {
    li.append(el('span', `papel papel--${u.papel}`, icone(u.papel === 'admin' ? 'escudo' : 'usuario'), PAPEIS[u.papel].nome));
    return li;
  }

  // Tipo de acesso em lista: muda na hora.
  const papel = el('select', 'papel-select');
  papel.setAttribute('aria-label', `Acesso de ${u.nome}`);
  for (const [chave, info] of Object.entries(PAPEIS)) {
    const opcao = el('option', '', info.nome);
    opcao.value = chave;
    opcao.selected = chave === u.papel;
    papel.append(opcao);
  }
  papel.addEventListener('change', async () => {
    try {
      await api(`/api/usuarios/${u.id}`, { method: 'PATCH', corpo: { papel: papel.value } });
      acoes.avisar(`${u.nome} agora é ${PAPEIS[papel.value].nome.toLowerCase()}.`);
      acoes.recarregar();
    } catch (e) {
      papel.value = u.papel;
      acoes.avisar(e.message, 'erro');
    }
  });

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
      acoes.avisar(`Senha de ${u.nome} redefinida. Passe por um canal seguro; dá para trocar depois em "Minha senha".`);
      formSenha.hidden = true;
      campo.value = '';
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    }
  });

  const remover = botao('Remover', 'botao--perigo botao--pequeno', null);
  let confirmando = false;
  remover.addEventListener('click', async () => {
    if (!confirmando) {
      confirmando = true;
      remover.querySelector('span').textContent = 'Confirmar remoção';
      setTimeout(() => { confirmando = false; if (remover.isConnected) remover.querySelector('span').textContent = 'Remover'; }, 4000);
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

  li.append(
    el('div', 'pessoa-acoes',
      papel,
      botao('Senha', 'botao--fantasma botao--pequeno', () => { formSenha.hidden = !formSenha.hidden; if (!formSenha.hidden) campo.focus(); }, { icone: 'chave', titulo: 'Definir uma senha provisória' }),
      remover),
    formSenha);
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
  const papeis = el('div', 'escolha-papel', Object.entries(PAPEIS).map(([chave, info]) => {
    const radio = el('input');
    radio.type = 'radio';
    radio.name = 'papel';
    radio.value = chave;
    radio.checked = chave === 'funcionario';
    return el('label', 'opcao-papel', radio, el('span', '', el('strong', '', info.nome), el('small', '', info.descricao)));
  }));
  const aviso = el('p', 'aviso');
  form.append(
    el('div', 'bloco-topo', el('h2', '', 'Dar acesso a alguém')),
    campo('Nome', 'nome', 'text', { autocomplete: 'off', maxLength: 80, placeholder: 'Ex.: Maria Souza' }),
    campo('Usuário (para entrar)', 'usuario', 'text', { autocomplete: 'off', maxLength: 60, placeholder: 'Ex.: maria', autocapitalize: 'none', spellcheck: false }),
    campo('Senha provisória', 'senha', 'password', { autocomplete: 'new-password', minLength: 10, placeholder: 'Mínimo de 10 caracteres' }),
    el('fieldset', 'campo', el('legend', '', 'Tipo de acesso'), papeis),
    aviso,
    el('div', 'form-acoes', botao('Criar acesso', 'botao--primario', null, { icone: 'mais' })));
  form.querySelector('.form-acoes button').type = 'submit';
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    aviso.textContent = '';
    const dados = Object.fromEntries(new FormData(form));
    try {
      await api('/api/usuarios', { method: 'POST', corpo: dados });
      acoes.avisar(`${dados.nome} já pode entrar com o usuário "${dados.usuario.toLowerCase()}" (${PAPEIS[dados.papel].nome.toLowerCase()}).`);
      form.reset();
      acoes.recarregar();
    } catch (e) {
      aviso.textContent = e.message;
    }
  });
  return form;
}

function explicacao() {
  return el('section', 'bloco explicacao-papeis',
    el('div', 'bloco-topo', el('h2', '', 'O que cada acesso vê')),
    el('div', 'papel-linha', el('span', 'papel papel--admin', icone('escudo'), 'Administrador'),
      el('p', '', 'Visão geral, caixa de entrada completa, andamento, agenda com pagamentos, arquivo e equipe. Vê valores e pagamentos, cuida das etapas Pedido e Notas e ordens e anexa notas fiscais e ordens de serviço.')),
    el('div', 'papel-linha', el('span', 'papel papel--funcionario', icone('usuario'), 'Funcionário'),
      el('p', '', 'Só as demandas em que é o responsável, a agenda e os concluídos dele. Trabalha de Processo iniciado até concluir, e anota. Não vê valores, pagamentos, notas fiscais, ordens de serviço, outros contatos nem a equipe.')));
}
