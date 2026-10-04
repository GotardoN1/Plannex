// Cadastro manual: pedidos que chegam por WhatsApp, telefone, indicação ou e-mail direto.
import { acoes } from './estado.js';
import { api } from './api.js';
import { el, botao, SERVICOS, ORIGENS } from './util.js';

const janela = () => document.querySelector('#novo');

export function abrirNovo() {
  const form = el('form', 'form-novo');
  const aviso = el('p', 'aviso');

  const servicos = el('div', 'escolha-servico', Object.entries(SERVICOS).map(([chave, info], i) => {
    const radio = el('input');
    radio.type = 'radio';
    radio.name = 'servico';
    radio.value = chave;
    radio.checked = i === 0;
    return el('label', `opcao-servico opcao-servico--${chave}`, radio, el('span', '', info.nome));
  }));

  const entrada = (rotulo, nome, tipo = 'text', extras = {}) => {
    const campo = el(tipo === 'textarea' ? 'textarea' : 'input');
    if (tipo !== 'textarea') campo.type = tipo;
    campo.name = nome;
    Object.assign(campo, extras);
    return el('label', 'campo', rotulo, campo);
  };

  const origem = el('select');
  origem.name = 'origem';
  for (const [chave, nome] of Object.entries(ORIGENS)) {
    if (chave === 'site') continue;
    const o = el('option', '', nome);
    o.value = chave;
    origem.append(o);
  }

  const direto = el('input');
  direto.type = 'checkbox';
  direto.name = 'direto_para_pedido';
  direto.checked = true;

  form.append(
    el('header', 'ficha-topo ficha-topo--simples', el('h2', '', 'Novo contato'),
      botao('', 'botao--icone botao--fantasma', () => janela().close(), { icone: 'fechar', titulo: 'Fechar' })),
    el('div', 'novo-corpo',
      el('fieldset', 'campo', el('legend', '', 'Serviço'), servicos),
      entrada('Nome', 'nome', 'text', { required: true, maxLength: 120, autocomplete: 'off', placeholder: 'Nome da pessoa ou empresa' }),
      el('div', 'campos-lado campos-lado--3',
        entrada('WhatsApp', 'telefone', 'tel', { maxLength: 20, placeholder: '(00) 00000-0000' }),
        entrada('E-mail', 'email', 'email', { maxLength: 180, placeholder: 'email@exemplo.com' }),
        entrada('CPF/CNPJ', 'cpf', 'text', { maxLength: 20, placeholder: '000.000.000-00', inputMode: 'numeric' })),
      el('label', 'campo', 'Como chegou', origem),
      entrada('O que a pessoa precisa', 'descricao', 'textarea', { rows: 4, maxLength: 1800 }),
      el('label', 'caixa-marcar', direto, el('span', '', 'Já aceito: entra direto no andamento, em ', el('strong', '', 'Notas e ordens'))),
      aviso),
    el('footer', 'form-acoes',
      botao('Cancelar', 'botao--fantasma', () => janela().close()),
      botao('Cadastrar', 'botao--primario', null, { icone: 'mais' })));
  form.querySelector('footer .botao--primario').type = 'submit';

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    aviso.textContent = '';
    const dados = Object.fromEntries(new FormData(form));
    dados.direto_para_pedido = direto.checked;
    if (!dados.nome?.trim()) { aviso.textContent = 'Informe o nome.'; return; }
    try {
      const { id } = await api('/api/contatos', { method: 'POST', corpo: dados });
      janela().close();
      acoes.avisar(`${dados.nome.trim()} cadastrado.`);
      await acoes.recarregar();
      acoes.abrirFicha(id);
    } catch (e) {
      aviso.textContent = e.message;
    }
  });

  janela().replaceChildren(form);
  janela().showModal();
  form.querySelector('[name="nome"]').focus();
}
