// Equipe (só administrador): quem acessa a Central, nome completo, tipo de acesso, novos acessos,
// senha provisória e como está a carga de trabalho de cada um.
import { estado, acoes, ativos } from './estado.js';
import { api } from './api.js';
import { el, botao, icone, avatar, dataCurta, PAPEIS, hoje, diaDe, nomeExibicao } from './util.js';

// Sugestões de equipe/área; dá para escrever outra.
const AREAS = ['Administrativo', 'Advogado', 'Contador', 'Economista', 'Financeiro', 'Comercial', 'T.I.'];

function listaDeAreas() {
  const lista = el('datalist');
  lista.id = 'areas-equipe';
  const usadas = estado.usuarios.map(u => u.area).filter(Boolean);
  for (const area of [...new Set([...AREAS, ...usadas])].sort((a, b) => a.localeCompare(b))) {
    const opcao = el('option');
    opcao.value = area;
    lista.append(opcao);
  }
  return lista;
}

const etiquetaArea = u => (u.area ? el('span', 'area-equipe', icone('equipe'), u.area) : null);

export function desenharEquipe(raiz) {
  const cabecalho = el('header', 'tela-topo',
    el('div', '', el('h1', '', 'Equipe')));

  const admins = estado.usuarios.filter(u => u.papel === 'admin');
  const funcionarios = estado.usuarios.filter(u => u.papel !== 'admin');
  const grupo = (titulo, pessoas) => el('section', 'bloco',
    el('div', 'bloco-topo', el('h2', '', `${titulo} (${pessoas.length})`)),
    pessoas.length ? el('ul', 'equipe', pessoas.map(pessoa)) : el('p', 'vazio-mini', 'Ninguém com este acesso ainda.'));

  raiz.replaceChildren(cabecalho, listaDeAreas(),
    el('div', 'equipe-grade',
      el('div', 'equipe-lado', grupo('Administradores', admins), grupo('Funcionários', funcionarios)),
      el('div', 'equipe-lado', cargaDaEquipe(), formularioNovo())));
}

function pessoa(u) {
  const voce = u.id === estado.usuario.id;
  const comEla = ativos().filter(c => c.responsavel_id === u.id && c.etapa !== 'entregue').length;
  const formNome = formularioDados(u);
  const editarNome = botao('', 'botao--icone botao--fantasma botao--pequeno', () => {
    formNome.hidden = !formNome.hidden;
    if (!formNome.hidden) formNome.querySelector('input').focus();
  }, { icone: 'editar', titulo: `Alterar nome, usuário ou equipe de ${u.nome}` });
  const li = el('li', 'pessoa',
    avatar(u.nome, 'avatar--medio'),
    el('div', 'pessoa-texto',
      el('strong', '', u.nome, editarNome, voce ? el('span', 'voce', 'você') : null),
      el('span', '', [`@${u.usuario}`, u.apelido ? `"${u.apelido}"` : null, `desde ${dataCurta(u.criado_em)}`, `${comEla} ${comEla === 1 ? 'demanda ativa' : 'demandas ativas'}`].filter(Boolean).join(' · '))));
  if (voce) {
    li.append(el('div', 'pessoa-acoes', etiquetaArea(u), el('span', `papel papel--${u.papel}`, icone(u.papel === 'admin' ? 'escudo' : 'usuario'), PAPEIS[u.papel].nome)), formNome);
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
      acoes.avisar(`Senha de ${u.nome} redefinida. Passe por um canal seguro; dá para trocar depois em Preferências.`);
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
      etiquetaArea(u),
      papel,
      botao('Senha', 'botao--fantasma botao--pequeno', () => { formSenha.hidden = !formSenha.hidden; if (!formSenha.hidden) campo.focus(); }, { icone: 'chave', titulo: 'Definir uma senha provisória' }),
      remover),
    formNome,
    formSenha);
  return li;
}

// Nome completo, usuário de login e equipe. Só o que mudou vai para o servidor.
function formularioDados(u) {
  const form = el('form', 'pessoa-dados');
  form.hidden = true;
  const entrada = (rotulo, valor, extras = {}) => {
    const campo = el('input');
    campo.value = valor || '';
    campo.autocomplete = 'off';
    Object.assign(campo, extras);
    return [campo, el('label', 'campo', rotulo, campo)];
  };
  const [nome, campoNome] = entrada('Nome completo', u.nome, { maxLength: 80 });
  const [login, campoLogin] = entrada('Usuário (para entrar)', u.usuario, { maxLength: 60, autocapitalize: 'none', spellcheck: false });
  const [area, campoArea] = entrada('Equipe', u.area, { maxLength: 30, placeholder: 'Ex.: Economista' });
  area.setAttribute('list', 'areas-equipe');
  const salvar = botao('Salvar', 'botao--primario botao--pequeno', null);
  salvar.type = 'submit';
  form.append(campoNome, campoLogin, campoArea, el('div', 'form-acoes', salvar));
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    const corpo = {};
    if (nome.value.trim() !== u.nome) corpo.nome = nome.value.trim();
    if (login.value.trim().toLowerCase() !== u.usuario) corpo.usuario = login.value.trim().toLowerCase();
    if (area.value.trim() !== (u.area || '')) corpo.area = area.value.trim();
    if (!Object.keys(corpo).length) { form.hidden = true; return; }
    salvar.disabled = true;
    try {
      await api(`/api/usuarios/${u.id}`, { method: 'PATCH', corpo });
      acoes.avisar(corpo.usuario ? `Dados salvos. ${u.nome} agora entra com o usuário "${corpo.usuario}".` : 'Dados salvos.');
      acoes.recarregar();
    } catch (e) {
      acoes.avisar(e.message, 'erro');
      salvar.disabled = false;
    }
  });
  return form;
}

// Carga de trabalho: o que cada um tem em andamento, o que está atrasado e o que entregou no mês.
function cargaDaEquipe() {
  const dia = hoje();
  const mes = dia.slice(0, 7);
  const contatos = ativos();
  const linhas = estado.usuarios.map(u => {
    const dele = contatos.filter(c => c.responsavel_id === u.id);
    const abertas = dele.filter(c => c.etapa && c.etapa !== 'entregue');
    return {
      u,
      abertas: abertas.length,
      atrasadas: abertas.filter(c => c.prazo && c.prazo < dia).length,
      entregues: dele.filter(c => c.etapa === 'entregue' && c.atualizado_em && diaDe(c.atualizado_em).startsWith(mes)).length,
    };
  }).sort((a, b) => b.abertas - a.abertas || a.u.nome.localeCompare(b.u.nome));
  const semResponsavel = contatos.filter(c => c.etapa && c.etapa !== 'entregue' && !c.responsavel_id).length;
  const maximo = Math.max(1, ...linhas.map(l => l.abertas));

  const tabela = el('table', 'carga',
    el('thead', '', el('tr', '', el('th', '', 'Pessoa'), el('th', '', 'Em andamento'), el('th', '', 'Atrasadas'), el('th', '', 'Entregues no mês'))),
    el('tbody', '', linhas.map(l => {
      const barra = el('span', 'carga-barra');
      barra.style.width = `${Math.round((l.abertas / maximo) * 100)}%`;
      return el('tr', '',
        el('td', '', el('span', 'carga-pessoa', avatar(l.u.nome), nomeExibicao(l.u))),
        el('td', '', el('span', 'carga-andamento', el('strong', '', String(l.abertas)), el('span', 'carga-trilho', barra))),
        el('td', l.atrasadas ? 'carga-atrasadas' : '', l.atrasadas ? el('span', '', icone('alerta'), String(l.atrasadas)) : '0'),
        el('td', '', String(l.entregues)));
    })));
  return el('section', 'bloco carga-equipe',
    el('div', 'bloco-topo', el('h2', '', 'Carga da equipe')),
    tabela,
    semResponsavel
      ? botao(`${semResponsavel} ${semResponsavel === 1 ? 'demanda' : 'demandas'} em andamento sem responsável`, 'botao--fantasma botao--pequeno carga-sem', () => acoes.navegar('andamento'), { icone: 'alerta' })
      : null);
}

function campoArea() {
  const entrada = el('input');
  entrada.name = 'area';
  entrada.maxLength = 30;
  entrada.autocomplete = 'off';
  entrada.placeholder = 'Ex.: Economista, Advogado, T.I.';
  entrada.setAttribute('list', 'areas-equipe');
  return el('label', 'campo', 'Equipe', entrada);
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
    campoArea(),
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
