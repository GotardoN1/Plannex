// Ficha do contato: dados do formulário, negócio (valor, nota, pagamento, prazo, responsável),
// etapas e linha do tempo com anotações da equipe.
import { estado, acoes, contatoPorId, usuarioPorId } from './estado.js';
import { api } from './api.js';
import {
  el, botao, link, icone, avatar, etiquetaServico, ETAPAS, NOME_ETAPA, CAIXA, SERVICOS, ORIGENS, indiceEtapa,
  dataHora, relativo, reais, lerReais, centavosParaCampo, situacaoPrazo, linkWhatsApp, linkEmail, diaBr,
} from './util.js';

const janela = () => document.querySelector('#ficha');
let atualId = null;
let editandoDados = false;

export const fichaAberta = () => (janela().open ? atualId : null);

export function abrirFicha(id) {
  const contato = contatoPorId(id);
  if (!contato) {
    acoes.avisar('Esse contato não existe mais.', 'erro');
    return;
  }
  atualId = id;
  editandoDados = false;
  desenhar();
  if (!janela().open) janela().showModal();
  janela().querySelector('.ficha-corpo').scrollTop = 0;
  carregarLinhaDoTempo();
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
  carregarLinhaDoTempo();
}

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

  const corpo = el('div', 'ficha-corpo',
    etapas(c),
    acoesRapidas(c),
    el('div', 'ficha-grade',
      el('div', 'ficha-coluna', blocoContato(c), blocoSolicitacao(c)),
      el('div', 'ficha-coluna', blocoNegocio(c), blocoLinhaDoTempo())));

  janela().replaceChildren(cabecalho, corpo);
}

// ---------- Etapas ----------

function etapas(c) {
  const atual = c.etapa ? indiceEtapa(c.etapa) : -1;
  const passos = [[null, CAIXA], ...ETAPAS];
  const trilha = el('ol', 'trilha');
  passos.forEach(([chave, nome], i) => {
    const posicao = i - 1;
    const estadoPasso = posicao < atual ? 'feito' : posicao === atual ? 'atual' : 'futuro';
    const b = el('button', `trilha-passo trilha-passo--${estadoPasso}`, el('span', 'trilha-ponto', estadoPasso === 'feito' ? icone('ok') : String(i)), el('span', 'trilha-nome', nome));
    b.type = 'button';
    b.title = posicao === atual ? `Etapa atual: ${nome}` : `Mover para ${nome}`;
    if (posicao === atual) b.setAttribute('aria-current', 'step');
    b.addEventListener('click', () => { if (posicao !== atual) acoes.mover(c.id, chave); });
    trilha.append(el('li', '', b));
  });
  const proxima = ETAPAS[atual + 1];
  return el('section', 'ficha-etapas',
    el('div', 'ficha-etapas-topo',
      el('h3', '', 'Andamento'),
      proxima ? botao(`Avançar para ${proxima[1]}`, 'botao--primario botao--pequeno', () => acoes.mover(c.id, proxima[0]), { icone: 'seta_dir' })
        : el('span', 'concluido', icone('ok'), 'Entregue')),
    trilha);
}

// ---------- Ações rápidas ----------

function acoesRapidas(c) {
  const barra = el('div', 'ficha-acoes');
  const whatsapp = linkWhatsApp(c);
  const email = linkEmail(c);
  if (whatsapp) barra.append(link('WhatsApp', whatsapp, 'botao botao--whatsapp', { icone: 'whatsapp', novaAba: true, titulo: 'Abrir conversa com mensagem pronta' }));
  if (email) barra.append(link('Responder por e-mail', email, 'botao', { icone: 'email' }));
  if (c.arquivado_em) {
    barra.append(botao('Restaurar', 'botao--fantasma', () => acoes.alterar(c.id, { arquivado: false }, 'Contato restaurado.'), { icone: 'restaurar' }));
  } else {
    barra.append(botao('Arquivar', 'botao--fantasma', () => acoes.alterar(c.id, { arquivado: true }, 'Contato arquivado. Ele fica na aba Arquivo.'), { icone: 'arquivo', titulo: 'Para contatos que não fecharam. Nada é apagado.' }));
  }
  // Excluir pede um segundo clique para confirmar.
  const excluir = botao('Excluir', 'botao--perigo', null, { icone: 'lixo' });
  let confirmando = false;
  excluir.addEventListener('click', async () => {
    if (!confirmando) {
      confirmando = true;
      excluir.querySelector('span').textContent = 'Confirmar exclusão';
      excluir.classList.add('is-confirmando');
      setTimeout(() => {
        confirmando = false;
        if (excluir.isConnected) { excluir.querySelector('span').textContent = 'Excluir'; excluir.classList.remove('is-confirmando'); }
      }, 4000);
      return;
    }
    try {
      await api(`/api/contatos/${c.id}`, { method: 'DELETE' });
      janela().close();
      acoes.avisar(`${c.nome} foi excluído. O e-mail recebido continua na caixa de e-mail.`);
      acoes.recarregar();
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    }
  });
  barra.append(excluir);
  return barra;
}

// ---------- Contato ----------

function blocoContato(c) {
  const titulo = el('div', 'bloco-topo', el('h3', '', 'Contato'),
    botao(editandoDados ? 'Cancelar' : 'Editar', 'botao--fantasma botao--pequeno', () => { editandoDados = !editandoDados; desenhar(); carregarLinhaDoTempo(); }, { icone: editandoDados ? 'fechar' : 'editar' }));
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
  for (const [chave, info] of Object.entries(SERVICOS)) {
    const opcao = el('option', '', info.nome);
    opcao.value = chave;
    opcao.selected = chave === c.servico;
    servico.append(opcao);
  }
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
    const dados = Object.fromEntries(new FormData(form));
    const ok = await acoes.alterar(c.id, { dados }, 'Dados do contato salvos.');
    if (ok) {
      editandoDados = false;
      desenhar();
      carregarLinhaDoTempo();
    }
  });
  return form;
}

// ---------- Solicitação ----------

function blocoSolicitacao(c) {
  const campos = [
    ['Plano de interesse', c.plano],
    ['Necessidade', c.descricao],
    ['Atividade a automatizar', c.atividade_manual],
    ['O que deve continuar igual', c.manter_inalterado],
    ['Documentos', c.envio_documentos === 'Anexar agora' ? 'Anexou arquivos: estão no e-mail da solicitação' : c.envio_documentos],
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

// ---------- Negócio ----------

function blocoNegocio(c) {
  const salvo = el('span', 'salvo', icone('ok'), 'Salvo');
  salvo.hidden = true;
  const salvar = async campos => {
    const ok = await acoes.alterar(c.id, campos, null);
    if (ok) {
      salvo.hidden = false;
      clearTimeout(salvo._espera);
      salvo._espera = setTimeout(() => { salvo.hidden = true; }, 1800);
    }
  };

  const responsavel = el('select');
  responsavel.append(opcao('', 'Ninguém'));
  for (const u of estado.usuarios) responsavel.append(opcao(String(u.id), u.id === estado.usuario.id ? `${u.nome} (você)` : u.nome));
  responsavel.value = c.responsavel_id ? String(c.responsavel_id) : '';
  responsavel.addEventListener('change', () => salvar({ responsavel_id: responsavel.value ? Number(responsavel.value) : null }));

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

  const data = (campo, valorAtual) => {
    const entrada = el('input');
    entrada.type = 'date';
    entrada.value = valorAtual || '';
    entrada.addEventListener('change', () => salvar({ [campo]: entrada.value || null }));
    return entrada;
  };

  const prazo = c.etapa !== 'entregue' ? situacaoPrazo(c.prazo) : null;
  return el('section', 'bloco bloco--negocio',
    el('div', 'bloco-topo', el('h3', '', 'Negócio'), salvo),
    el('div', 'negocio',
      el('label', 'campo', 'Responsável', responsavel),
      el('label', 'campo campo--reais', 'Valor', el('span', 'prefixo', el('i', '', 'R$'), valor)),
      el('label', 'campo', 'Nota fiscal', nota),
      el('label', 'campo', 'Pagamento recebido em', data('pago_em', c.pago_em)),
      el('label', 'campo', el('span', '', 'Prazo de entrega', prazo ? el('span', `chip-prazo chip-prazo--${prazo.classe}`, prazo.texto) : null), data('prazo', c.prazo))),
    c.valor_centavos !== null && c.valor_centavos !== undefined
      ? el('p', `negocio-resumo${c.pago_em ? ' is-pago' : ''}`, icone(c.pago_em ? 'ok' : 'dinheiro'),
        c.pago_em ? `${reais(c.valor_centavos)} recebidos em ${diaBr(c.pago_em)}` : `${reais(c.valor_centavos)} a receber`)
      : null);
}

function opcao(valor, texto) {
  const o = el('option', '', texto);
  o.value = valor;
  return o;
}

// ---------- Linha do tempo ----------

function blocoLinhaDoTempo() {
  const texto = el('textarea');
  texto.rows = 3;
  texto.maxLength = 2000;
  texto.placeholder = 'Anotar algo sobre este contato… (Ctrl+Enter salva)';
  texto.setAttribute('aria-label', 'Nova anotação');
  const anotar = botao('Anotar', 'botao--primario botao--pequeno', null, { icone: 'nota' });
  const enviar = async () => {
    const conteudo = texto.value.trim();
    if (!conteudo) return;
    anotar.disabled = true;
    try {
      await api(`/api/contatos/${atualId}/notas`, { method: 'POST', corpo: { texto: conteudo } });
      texto.value = '';
      carregarLinhaDoTempo();
      acoes.recarregar({ silencioso: true });
    } catch (e) {
      acoes.avisar(e.message, 'erro');
    } finally {
      anotar.disabled = false;
    }
  };
  anotar.addEventListener('click', enviar);
  texto.addEventListener('keydown', evento => {
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) enviar();
  });
  return el('section', 'bloco',
    el('div', 'bloco-topo', el('h3', '', 'Linha do tempo')),
    el('div', 'anotar', texto, anotar),
    el('ol', 'linha-tempo', el('li', 'carregando', 'Carregando…')));
}

async function carregarLinhaDoTempo() {
  const id = atualId;
  const lista = janela().querySelector('.linha-tempo');
  if (!lista) return;
  try {
    const { itens } = await api(`/api/contatos/${id}/linha-do-tempo`);
    if (id !== atualId || !lista.isConnected) return;
    const c = contatoPorId(id);
    const chegada = { tipo: 'chegada', quando: c.criado_em };
    lista.replaceChildren(...[...itens].reverse().concat(chegada).map(i => itemLinha(i, c)));
  } catch (e) {
    lista.replaceChildren(el('li', 'aviso', e.message));
  }
}

function itemLinha(i, c) {
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
    conteudo = el('div', 'nota-texto', el('strong', '', quem || 'Alguém'), el('p', '', i.texto));
  } else {
    conteudo = el('p', '', el('strong', '', quem || 'Alguém'), ` ${i.texto}`);
  }
  const li = el('li', `evento-linha evento-linha--${i.tipo}`,
    el('span', 'evento-icone', icone(iconeItem)),
    el('div', 'evento-conteudo', conteudo, el('time', '', dataHora(i.quando))));
  if (i.tipo === 'nota' && i.usuario_id === estado.usuario.id) {
    li.append(botao('', 'botao--icone botao--fantasma botao--pequeno apagar-nota', async () => {
      try {
        await api(`/api/notas/${i.nota_id}`, { method: 'DELETE' });
        carregarLinhaDoTempo();
        acoes.recarregar({ silencioso: true });
      } catch (e) {
        acoes.avisar(e.message, 'erro');
      }
    }, { icone: 'lixo', titulo: 'Apagar minha anotação' }));
  }
  return li;
}
