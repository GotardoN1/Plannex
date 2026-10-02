// Etiquetas pessoais: cada pessoa marca as demandas do jeito dela (ex.: "Pacote Evolução",
// "Veio do WhatsApp") com uma cor. Só quem criou vê. As de serviço (Cálculos/Automação) são fixas.
import { estado, acoes, etiquetasDe } from './estado.js';
import { api } from './api.js';
import { el, icone, CORES_ETIQUETA } from './util.js';

let sequencia = 0;

// Chips da demanda e o botão "+" para criar outra.
export function etiquetasDaDemanda(contato) {
  const caixa = el('span', 'etiquetas');
  for (const etiqueta of etiquetasDe(contato.id)) {
    const tirar = el('button', 'etiqueta-tirar', icone('fechar'));
    tirar.type = 'button';
    tirar.title = `Tirar a etiqueta "${etiqueta.texto}"`;
    tirar.setAttribute('aria-label', tirar.title);
    tirar.addEventListener('click', async evento => {
      evento.stopPropagation();
      try {
        await api(`/api/etiquetas/${etiqueta.id}`, { method: 'DELETE' });
        estado.etiquetas = estado.etiquetas.filter(e => e.id !== etiqueta.id);
        acoes.recarregar({ silencioso: true });
      } catch (e) {
        acoes.avisar(e.message, 'erro');
      }
    });
    caixa.append(el('span', `etiqueta etiqueta--${etiqueta.cor}`, etiqueta.texto, tirar));
  }
  const mais = el('button', 'etiqueta-mais', icone('mais'));
  mais.type = 'button';
  mais.title = 'Nova etiqueta (só você vê)';
  mais.setAttribute('aria-label', mais.title);
  mais.addEventListener('click', evento => {
    evento.stopPropagation();
    abrirCriacao(mais, contato);
  });
  caixa.append(mais);
  // Cliques aqui dentro não abrem a ficha da linha.
  caixa.addEventListener('click', evento => evento.stopPropagation());
  caixa.addEventListener('keydown', evento => evento.stopPropagation());
  return caixa;
}

function abrirCriacao(botao, contato) {
  document.querySelector('.etiqueta-caixa')?.remove();
  const id = `etiquetas-usadas-${++sequencia}`;

  // Sugestões: as etiquetas que a pessoa já usou em outras demandas.
  const usadas = new Map();
  for (const e of estado.etiquetas || []) if (!usadas.has(e.texto.toLowerCase())) usadas.set(e.texto.toLowerCase(), e);
  const sugestoes = el('datalist');
  sugestoes.id = id;
  for (const e of usadas.values()) {
    const opcao = el('option');
    opcao.value = e.texto;
    sugestoes.append(opcao);
  }

  const texto = el('input');
  texto.maxLength = 24;
  texto.placeholder = 'Ex.: Pacote Evolução';
  texto.setAttribute('list', id);
  texto.setAttribute('aria-label', 'Texto da etiqueta');

  let cor = 'laranja';
  const cores = el('div', 'etiqueta-cores', Object.entries(CORES_ETIQUETA).map(([chave, nome]) => {
    const b = el('button', `etiqueta-cor etiqueta--${chave}${chave === cor ? ' is-escolhida' : ''}`);
    b.type = 'button';
    b.title = nome;
    b.setAttribute('aria-label', `Cor ${nome}`);
    b.addEventListener('click', () => {
      cor = chave;
      for (const outro of cores.children) outro.classList.toggle('is-escolhida', outro === b);
    });
    return b;
  }));
  // Escolher uma sugestão já usada traz a cor dela.
  texto.addEventListener('input', () => {
    const usada = usadas.get(texto.value.trim().toLowerCase());
    if (usada) {
      cor = usada.cor;
      for (const b of cores.children) b.classList.toggle('is-escolhida', b.classList.contains(`etiqueta--${cor}`));
    }
  });

  const salvar = el('button', 'botao botao--primario botao--pequeno', 'Adicionar');
  salvar.type = 'button';
  const caixa = el('div', 'etiqueta-caixa', el('strong', '', 'Nova etiqueta'), texto, sugestoes, cores, el('div', 'etiqueta-caixa-acoes', salvar));
  caixa.popover = 'auto';
  caixa.addEventListener('click', evento => evento.stopPropagation());

  const enviar = async () => {
    const valor = texto.value.trim();
    if (!valor) { texto.focus(); return; }
    salvar.disabled = true;
    try {
      await api(`/api/contatos/${contato.id}/etiquetas`, { method: 'POST', corpo: { texto: valor, cor } });
      caixa.hidePopover();
      await acoes.recarregar({ silencioso: true });
    } catch (e) {
      acoes.avisar(e.message, 'erro');
      salvar.disabled = false;
    }
  };
  salvar.addEventListener('click', enviar);
  texto.addEventListener('keydown', evento => {
    if (evento.key === 'Enter') { evento.preventDefault(); enviar(); }
  });
  caixa.addEventListener('toggle', evento => { if (evento.newState === 'closed') caixa.remove(); });

  // Dentro da ficha (janela modal), a caixinha precisa nascer dentro dela para receber os cliques.
  (botao.closest('dialog') || document.body).append(caixa);
  caixa.showPopover();
  const r = botao.getBoundingClientRect();
  const largura = caixa.offsetWidth;
  caixa.style.left = `${Math.max(8, Math.min(r.left, innerWidth - largura - 8))}px`;
  caixa.style.top = `${Math.min(r.bottom + 6, innerHeight - caixa.offsetHeight - 8)}px`;
  texto.focus();
}
