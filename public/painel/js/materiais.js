// Materiais: arquivos de uso frequente da equipe (moldes, planilhas de demonstração, PDFs).
// O administrador envia, troca o arquivo, descreve, exclui e escolhe quem vê: toda a equipe ou só
// administradores. Funcionários veem e baixam só os da equipe toda. Espaço pequeno (100 MB).
import { estado, acoes, eAdmin } from './estado.js';
import { api } from './api.js';
import { el, botao, icone, dataHora, relativo, tamanhoArquivo, tipoArquivo } from './util.js';

const ESPACO = 100 * 1024 * 1024;
let sequencia = 0;

const VISIBILIDADE = { todos: 'Toda a equipe', admin: 'Só administradores' };

function listaVisibilidade(atual, rotulo) {
  const lista = el('select', 'papel-select');
  lista.setAttribute('aria-label', rotulo);
  for (const [chave, nome] of Object.entries(VISIBILIDADE)) {
    const opcao = el('option', '', nome);
    opcao.value = chave;
    opcao.selected = chave === atual;
    lista.append(opcao);
  }
  return lista;
}

function miniatura(nome) {
  const tipo = tipoArquivo(nome);
  const m = el('span', `miniatura miniatura--${tipo.classe}`, el('span', 'miniatura-sigla', tipo.rotulo));
  m.setAttribute('aria-hidden', 'true');
  return m;
}

// Envia um arquivo novo (sem id) ou troca o de um material (com id).
async function enviar(arquivo, { id = null, descricao, visibilidade } = {}) {
  if (arquivo.size > 10 * 1024 * 1024) throw new Error(`${arquivo.name} passa de 10 MB.`);
  const corpo = new FormData();
  corpo.append('arquivo', arquivo);
  if (descricao !== undefined) corpo.append('descricao', descricao);
  if (visibilidade) corpo.append('visibilidade', visibilidade);
  const resposta = await fetch(id ? `/api/materiais/${id}` : '/api/materiais', { method: 'POST', body: corpo, credentials: 'same-origin' });
  const retorno = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(retorno.erro || 'Não foi possível enviar.');
}

export function desenharMateriais(raiz) {
  const materiais = estado.materiais || [];
  const usado = materiais.reduce((s, m) => s + (m.tamanho || 0), 0);
  const cabecalho = el('header', 'tela-topo', el('div', '', el('h1', '', 'Materiais')));

  const partes = [cabecalho];
  if (eAdmin()) partes.push(formularioEnvio(usado));
  partes.push(el('section', 'bloco materiais-bloco',
    el('div', 'bloco-topo',
      el('h2', '', `Arquivos (${materiais.length})`),
      el('span', 'materiais-espaco', el('span', 'materiais-espaco-trilho', barra(usado)), `${tamanhoArquivo(usado)} de 100 MB`)),
    materiais.length
      ? el('ul', 'materiais', materiais.map(linha))
      : el('p', 'vazio-mini', eAdmin() ? 'Nenhum material ainda. Envie o primeiro acima.' : 'Nenhum material ainda.')));
  raiz.replaceChildren(...partes);
}

function barra(usado) {
  const b = el('span', 'materiais-espaco-barra');
  b.style.width = `${Math.min(100, Math.round((usado / ESPACO) * 100))}%`;
  return b;
}

function formularioEnvio(usado) {
  const id = `material-${++sequencia}`;
  const entrada = el('input');
  entrada.type = 'file';
  entrada.id = id;
  entrada.className = 'sr';
  const descricao = el('input');
  descricao.maxLength = 160;
  descricao.placeholder = 'Descrição (opcional): para que serve o arquivo';
  descricao.setAttribute('aria-label', 'Descrição do material');
  const quemVe = listaVisibilidade('todos', 'Quem vê o material');
  const status = el('p', 'aviso');
  const zona = el('label', 'zona-envio', icone('enviar'),
    el('span', '', el('strong', '', 'Escolha um arquivo'), ' ou arraste para cá'),
    el('small', '', `PDF, Word, Excel, imagem ou outro · até 10 MB · ${tamanhoArquivo(Math.max(0, ESPACO - usado))} livres`));
  zona.htmlFor = id;

  const mandar = async arquivo => {
    if (!arquivo) return;
    status.classList.remove('is-ok');
    status.textContent = `Enviando ${arquivo.name}…`;
    zona.classList.add('is-enviando');
    try {
      await enviar(arquivo, { descricao: descricao.value.trim(), visibilidade: quemVe.value });
      acoes.avisar(`${arquivo.name} salvo em Materiais.`);
      descricao.value = '';
      await acoes.recarregar({ silencioso: true });
    } catch (e) {
      status.textContent = e.message;
    } finally {
      entrada.value = '';
      zona.classList.remove('is-enviando');
    }
  };
  entrada.addEventListener('change', () => mandar(entrada.files[0]));
  zona.addEventListener('dragover', evento => { evento.preventDefault(); zona.classList.add('is-alvo'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('is-alvo'));
  zona.addEventListener('drop', evento => { evento.preventDefault(); zona.classList.remove('is-alvo'); mandar(evento.dataTransfer.files[0]); });

  return el('section', 'bloco materiais-envio',
    el('div', 'bloco-topo', el('h2', '', 'Enviar material')),
    el('div', 'materiais-envio-campos', descricao, el('label', 'campo materiais-quem', 'Quem vê', quemVe)), entrada, zona, status);
}

function linha(m) {
  const baixar = el('a', 'material-nome', miniatura(m.nome), el('span', '', m.nome));
  baixar.href = `/api/materiais/${m.id}`;
  baixar.download = m.nome;
  baixar.title = `Baixar ${m.nome}`;
  const trocou = m.atualizado_em !== m.criado_em;
  const info = el('span', 'material-info',
    el('span', '', tamanhoArquivo(m.tamanho)),
    el('span', '', `${trocou ? 'Atualizado' : 'Enviado'} ${relativo(m.atualizado_em)}`, el('span', 'sr', ` (${dataHora(m.atualizado_em)})`)),
    el('span', '', m.usuario ? `por ${m.usuario}` : 'por usuário removido'));
  info.title = `${trocou ? `Enviado em ${dataHora(m.criado_em)} · atualizado` : 'Enviado'} em ${dataHora(m.atualizado_em)}`;

  const privado = m.visibilidade === 'admin';
  // Selo de privado na linha de informações, para o nome não quebrar.
  if (privado) info.prepend(el('span', 'material-privado', icone('cadeado'), 'Só administradores'));
  const texto = el('div', 'material-texto', baixar, m.descricao ? el('p', 'material-descricao', m.descricao) : null, info);
  const download = el('a', 'botao botao--pequeno', icone('baixar'), el('span', '', 'Baixar'));
  download.href = baixar.href;
  download.download = m.nome;
  const acoesLinha = el('div', 'material-acoes', download);
  const li = el('li', 'material', texto, acoesLinha);
  if (!eAdmin()) return li;

  // Trocar o arquivo (mantém a descrição).
  const novo = el('input');
  novo.type = 'file';
  novo.className = 'sr';
  novo.addEventListener('change', async () => {
    const arquivo = novo.files[0];
    if (!arquivo) return;
    try {
      await enviar(arquivo, { id: m.id });
      acoes.avisar(`${m.nome} trocado por ${arquivo.name}.`);
      await acoes.recarregar({ silencioso: true });
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    } finally {
      novo.value = '';
    }
  });

  // Descrição editável.
  const form = el('form', 'material-editar');
  form.hidden = true;
  const campo = el('input');
  campo.maxLength = 160;
  campo.value = m.descricao || '';
  campo.setAttribute('aria-label', `Descrição de ${m.nome}`);
  const salvar = botao('Salvar', 'botao--primario botao--pequeno', null);
  salvar.type = 'submit';
  form.append(campo, salvar);
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    try {
      await api(`/api/materiais/${m.id}`, { method: 'PATCH', corpo: { descricao: campo.value.trim() } });
      acoes.avisar('Descrição salva.');
      acoes.recarregar({ silencioso: true });
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    }
  });

  const excluir = botao('', 'botao--icone botao--fantasma botao--pequeno', null, { icone: 'lixo', titulo: `Excluir ${m.nome} (clique duas vezes)` });
  let confirmando = false;
  excluir.addEventListener('click', async () => {
    if (!confirmando) {
      confirmando = true;
      excluir.classList.add('is-confirmando');
      excluir.title = 'Clique de novo para excluir';
      setTimeout(() => { confirmando = false; excluir.classList.remove('is-confirmando'); }, 4000);
      return;
    }
    try {
      await api(`/api/materiais/${m.id}`, { method: 'DELETE' });
      acoes.avisar(`${m.nome} excluído.`);
      acoes.recarregar({ silencioso: true });
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    }
  });

  // Quem vê: muda na hora, como o tipo de acesso na Equipe.
  const quemVe = listaVisibilidade(m.visibilidade || 'todos', `Quem vê ${m.nome}`);
  quemVe.addEventListener('change', async () => {
    try {
      await api(`/api/materiais/${m.id}`, { method: 'PATCH', corpo: { visibilidade: quemVe.value } });
      acoes.avisar(quemVe.value === 'admin' ? `${m.nome} agora é só dos administradores.` : `${m.nome} agora fica visível para toda a equipe.`);
      acoes.recarregar({ silencioso: true });
    } catch (e) {
      quemVe.value = m.visibilidade || 'todos';
      acoes.avisar(e.message, 'erro');
    }
  });

  acoesLinha.prepend(quemVe);
  acoesLinha.append(
    botao('', 'botao--icone botao--fantasma botao--pequeno', () => { form.hidden = !form.hidden; if (!form.hidden) campo.focus(); }, { icone: 'editar', titulo: 'Editar a descrição' }),
    botao('', 'botao--icone botao--fantasma botao--pequeno', () => novo.click(), { icone: 'enviar', titulo: 'Trocar o arquivo (mantém a descrição)' }),
    excluir, novo);
  li.append(form);
  return li;
}
