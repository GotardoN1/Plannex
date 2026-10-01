// Utilitários da Central: montagem de elementos, formatos e dados fixos.
// Os nomes e textos vêm de um formulário público: tudo vira textContent, nunca innerHTML.

// As chaves vêm do banco; os nomes são os da versão resumida das etapas.
export const ETAPAS = [
  ['pedido', 'Pedido'],
  ['nota_emitida', 'Notas e ordens'],
  ['processo_iniciado', 'Processo iniciado'],
  ['revisado', 'Revisado pelo cliente'],
  ['entregue', 'Entregue'],
];
// Etapas antigas continuam com nome, para o histórico de quem já passou por elas.
export const NOME_ETAPA = { ...Object.fromEntries(ETAPAS), pagamento_efetuado: 'Pagamento efetuado', concluido: 'Concluído' };
export const CAIXA = 'Caixa de entrada';
export const indiceEtapa = etapa => ETAPAS.findIndex(([chave]) => chave === etapa);

export const SERVICOS = {
  calculos: { nome: 'Cálculos', completo: 'Cálculos judiciais e financeiros' },
  automacao: { nome: 'Automação', completo: 'Criação e automação de planilhas' },
};

export const ORIGENS = {
  site: 'Site', whatsapp: 'WhatsApp', indicacao: 'Indicação', telefone: 'Telefone', email: 'E-mail', outro: 'Outro',
};

// ---------- Elementos ----------

export function el(tag, classe, ...filhos) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  for (const filho of filhos.flat()) {
    if (filho === null || filho === undefined || filho === false) continue;
    elemento.append(filho instanceof Node ? filho : String(filho));
  }
  return elemento;
}

export function botao(texto, classe, aoClicar, extras = {}) {
  const b = el('button', `botao ${classe || ''}`.trim());
  b.type = 'button';
  if (extras.icone) b.append(icone(extras.icone));
  if (texto) b.append(el('span', '', texto));
  if (extras.titulo) {
    b.title = extras.titulo;
    b.setAttribute('aria-label', extras.titulo);
  }
  if (aoClicar) b.addEventListener('click', aoClicar);
  return b;
}

export function link(texto, href, classe, extras = {}) {
  const a = el('a', classe || '');
  a.href = href;
  if (extras.icone) a.append(icone(extras.icone));
  if (texto) a.append(el('span', '', texto));
  if (extras.novaAba) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  if (extras.titulo) a.title = extras.titulo;
  return a;
}

const NS = 'http://www.w3.org/2000/svg';
export function svg(tag, atributos = {}, ...filhos) {
  const elemento = document.createElementNS(NS, tag);
  for (const [chave, valor] of Object.entries(atributos)) elemento.setAttribute(chave, valor);
  for (const filho of filhos.flat()) if (filho) elemento.append(filho instanceof Node ? filho : String(filho));
  return elemento;
}

// Ícones de traço (24x24). Strings fixas daqui, nunca dados de usuário.
const ICONES = {
  visao: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z"/>',
  entrada: '<path d="M4 13l2.5-7.5A2 2 0 0 1 8.4 4h7.2a2 2 0 0 1 1.9 1.5L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13h4l1.5 3h5L16 13h4"/>',
  andamento: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  agenda: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  arquivo: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
  equipe: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9.2 8.6c.3 2.4 2 4.3 4.6 5.1l1.1-1.2 1.8.9-.4 1.6c-3.8.2-7.2-3.2-7-7l1.6-.4.9 1.8z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  lixo: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  restaurar: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>',
  seta_esq: '<path d="M15 5l-7 7 7 7"/>',
  seta_dir: '<path d="M9 5l7 7-7 7"/>',
  sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2"/>',
  nota: '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8.5 12.5h7M8.5 16h5"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  alerta: '<path d="M12 3.5L2.8 19.5h18.4z"/><path d="M12 10v4M12 17v.5"/>',
  ok: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.6 2.6L16 9.5"/>',
  dinheiro: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  baixar: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  atualizar: '<path d="M20 12a8 8 0 1 1-2.4-5.7L20 8.5"/><path d="M20 4v4.5h-4.5"/>',
  etapa: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sistema: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  chegada: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  anexo: '<path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
  documento: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  enviar: '<path d="M12 16V4M7 8.5l5-5 5 5M5 20h14"/>',
  escudo: '<path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6z"/>',
};

export function icone(nome, classe = 'icone') {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', classe);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.innerHTML = ICONES[nome] || '';
  return s;
}

export function etiquetaServico(servico) {
  return el('span', `servico servico--${servico}`, SERVICOS[servico]?.nome || servico);
}

export function avatar(nome, classe = '') {
  const a = el('span', `avatar ${classe}`.trim(), iniciais(nome));
  a.title = nome || '';
  return a;
}

// ---------- Formatos ----------

const FUSO = 'America/Sao_Paulo';
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtDataCurta = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: 'short' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
const fmtDia = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtExtenso = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long' });
const fmtMes = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const fmtMesCurto = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long' });
const fmtReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtReaisCurto = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const dataHora = iso => (iso ? fmtDataHora.format(new Date(iso)).replace(',', ' às') : '');
export const dataCurta = iso => (iso ? fmtDataCurta.format(new Date(iso)).replace('.', '') : '');
export const hora = iso => (iso ? fmtHora.format(new Date(iso)) : '');
export const extenso = (data = new Date()) => fmtExtenso.format(data);
export const nomeMes = (ano, mes) => fmtMes.format(new Date(Date.UTC(ano, mes, 1)));
export const nomeMesCurto = (ano, mes) => fmtMesCurto.format(new Date(Date.UTC(ano, mes, 1)));
export const reais = centavos => fmtReais.format((centavos || 0) / 100);
export const reaisCurto = centavos => fmtReaisCurto.format((centavos || 0) / 100);

// Dia (AAAA-MM-DD) em Brasília de um instante ISO.
export function diaDe(iso) {
  const [d, m, a] = fmtDia.format(new Date(iso)).split('/');
  return `${a}-${m}-${d}`;
}
export const hoje = () => diaDe(new Date().toISOString());

// "12/10/2026" a partir de "2026-10-12"
export function diaBr(dia) {
  if (!dia) return '';
  const [a, m, d] = dia.split('-');
  return `${d}/${m}/${a}`;
}

// Diferença em dias entre dois dias AAAA-MM-DD (b - a).
export function diasEntre(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export function somarDias(dia, n) {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function relativo(iso) {
  if (!iso) return '';
  const segundos = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return 'agora';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = diasEntre(diaDe(iso), hoje());
  if (dias === 1) return `ontem, ${hora(iso)}`;
  if (dias < 7) return `há ${dias} dias`;
  return dataCurta(iso);
}

// Texto curto do prazo: "vence hoje", "em 3 dias", "atrasado 2 dias".
export function situacaoPrazo(prazo) {
  if (!prazo) return null;
  const dias = diasEntre(hoje(), prazo);
  if (dias < 0) return { classe: 'critico', texto: `atrasado ${-dias} ${-dias === 1 ? 'dia' : 'dias'}`, dias };
  if (dias === 0) return { classe: 'alerta', texto: 'vence hoje', dias };
  if (dias === 1) return { classe: 'alerta', texto: 'vence amanhã', dias };
  if (dias <= 3) return { classe: 'alerta', texto: `vence em ${dias} dias`, dias };
  return { classe: 'neutro', texto: `prazo ${diaBr(prazo).slice(0, 5)}`, dias };
}

export function iniciais(nome) {
  const partes = String(nome || '?').trim().split(/\s+/).filter(p => !/^(da|de|do|das|dos|e)$/i.test(p));
  return ((partes[0]?.[0] || '?') + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase();
}

export function primeiroNome(nome) {
  return String(nome || '').trim().split(/\s+/)[0] || '';
}

export function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// "1.234,56" ou "1234.5" -> centavos
export function lerReais(texto) {
  let t = String(texto || '').replace(/[^\d,.-]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const numero = Number(t);
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) : NaN;
}

export function centavosParaCampo(centavos) {
  return centavos === null || centavos === undefined ? '' : (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function tamanhoArquivo(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

export const PAPEIS = {
  admin: { nome: 'Administrador', descricao: 'Vê tudo: visão geral, todos os contatos, valores, arquivo e equipe.' },
  funcionario: { nome: 'Funcionário', descricao: 'Vê só as demandas em que é responsável e a agenda dele. Sem valores nem controle interno.' },
};

// ---------- Contato ----------

export function linkWhatsApp(contato) {
  let numero = String(contato.telefone || '').replace(/\D/g, '');
  if (numero.length < 10) return null;
  if (numero.length <= 11) numero = `55${numero}`;
  const mensagem = `Olá, ${primeiroNome(contato.nome)}! Aqui é da Plannex. Recebemos sua solicitação de ${SERVICOS[contato.servico]?.nome.toLowerCase() || 'serviço'} e vamos dar sequência por aqui.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function linkEmail(contato) {
  if (!contato.email) return null;
  const assunto = `Plannex · sua solicitação de ${SERVICOS[contato.servico]?.nome.toLowerCase() || 'serviço'}`;
  return `mailto:${encodeURIComponent(contato.email)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(`Olá, ${primeiroNome(contato.nome)}!\n\n`)}`;
}

export function textoBusca(contato) {
  return normalizar([contato.nome, contato.email, contato.telefone, contato.descricao, contato.nota_fiscal, contato.plano].join(' '));
}
