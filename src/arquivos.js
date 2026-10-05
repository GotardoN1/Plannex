// Validação dos arquivos enviados (site e Central). Cada fluxo tem a sua lista de formatos permitidos e o
// conteúdo real é conferido pela assinatura (primeiros bytes), não só pela extensão. O que não confere é
// recusado. Formatos que podem levar macros são tratados à parte: o .xlsm só entra onde a planilha com
// macros faz sentido (automação e entregas) e esses arquivos ficam marcados com um aviso na Central.

// Formatos conhecidos: tipo MIME guardado e como reconhecer o conteúdo.
const FORMATOS = {
  pdf: { tipo: 'application/pdf', confere: b => comeca(b, '%PDF-') },
  doc: { tipo: 'application/msword', confere: b => ole(b) || comeca(b, '{\\rtf'), aviso: 'macro-legado' },
  docx: { tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', confere: b => ooxml(b, 'word/', false) },
  odt: { tipo: 'application/vnd.oasis.opendocument.text', confere: b => odf(b, 'application/vnd.oasis.opendocument.text') },
  rtf: { tipo: 'application/rtf', confere: b => comeca(b, '{\\rtf') },
  txt: { tipo: 'text/plain', confere: b => texto(b) },
  xls: { tipo: 'application/vnd.ms-excel', confere: b => ole(b), aviso: 'macro-legado' },
  xlsx: { tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', confere: b => ooxml(b, 'xl/', false) },
  xlsm: { tipo: 'application/vnd.ms-excel.sheet.macroEnabled.12', confere: b => ooxml(b, 'xl/', true), aviso: 'macro' },
  ods: { tipo: 'application/vnd.oasis.opendocument.spreadsheet', confere: b => odf(b, 'application/vnd.oasis.opendocument.spreadsheet') },
  csv: { tipo: 'text/csv', confere: b => texto(b) },
  xml: { tipo: 'application/xml', confere: b => xml(b) },
  jpg: { tipo: 'image/jpeg', confere: b => bytes(b, [0xff, 0xd8, 0xff]) },
  jpeg: { tipo: 'image/jpeg', confere: b => bytes(b, [0xff, 0xd8, 0xff]) },
  png: { tipo: 'image/png', confere: b => bytes(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  webp: { tipo: 'image/webp', confere: b => comeca(b, 'RIFF') && ascii(b, 8, 12) === 'WEBP' },
  heic: { tipo: 'image/heic', confere: b => heif(b) },
  heif: { tipo: 'image/heif', confere: b => heif(b) },
  mp4: { tipo: 'video/mp4', confere: b => ascii(b, 4, 8) === 'ftyp' && !heif(b) },
};

const DOCUMENTOS = ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt'];
const PLANILHAS = ['xls', 'xlsx', 'ods', 'csv'];
const IMAGENS = ['jpg', 'jpeg', 'png', 'webp'];

// Formatos permitidos em cada fluxo.
export const FLUXOS = {
  // Documentos do cliente (site e aba Pedido). Planilha com macros só em demandas de automação.
  cliente: [...DOCUMENTOS, ...PLANILHAS, ...IMAGENS, 'heic', 'heif'],
  cliente_automacao: [...DOCUMENTOS, ...PLANILHAS, 'xlsm', ...IMAGENS, 'heic', 'heif'],
  // Arquivos da entrega: memória, parecer, planilha (com ou sem macros), guia e vídeo demonstrativo.
  entrega: [...DOCUMENTOS, ...PLANILHAS, 'xlsm', ...IMAGENS, 'mp4'],
  // Notas fiscais e ordens de serviço (administrador): PDF, XML da nota, imagens e documentos.
  financeiro: ['pdf', 'xml', ...IMAGENS, 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'],
  // Materiais da equipe.
  material: [...DOCUMENTOS, ...PLANILHAS, 'xlsm', ...IMAGENS, 'mp4'],
  // Moldes em branco (ordem de serviço e relatório).
  molde: ['pdf', 'doc', 'docx'],
};

// Fluxo de cada categoria de arquivo da demanda.
export function fluxoDaCategoria(categoria, servico) {
  if (categoria === 'cliente') return servico === 'automacao' ? 'cliente_automacao' : 'cliente';
  if (categoria === 'entrega') return 'entrega';
  return 'financeiro';
}

const NOMES = { pdf: 'PDF', doc: 'Word', docx: 'Word', odt: 'ODT', rtf: 'RTF', txt: 'TXT', xls: 'Excel', xlsx: 'Excel', xlsm: 'Excel com macros (.xlsm)', ods: 'ODS', csv: 'CSV', xml: 'XML', jpg: 'JPG', jpeg: 'JPG', png: 'PNG', webp: 'WEBP', heic: 'HEIC', heif: 'HEIF', mp4: 'vídeo MP4' };
export const descreverFluxo = fluxo => [...new Set(FLUXOS[fluxo].map(e => NOMES[e]))].join(', ');

// Confere um arquivo. Devolve { ok: true, tipo, aviso } ou { ok: false, erro }.
export async function validarArquivo(arquivo, fluxo) {
  const nome = String(arquivo?.name || '').trim();
  const extensao = (nome.match(/\.([a-z0-9]{1,5})$/i)?.[1] || '').toLowerCase();
  const permitidos = FLUXOS[fluxo] || [];
  if (!extensao || !permitidos.includes(extensao)) {
    const macro = /^(docm|dotm|xlsb|xltm|xlam|xla|pptm|potm|ppam|ppsm|sldm)$/.test(extensao);
    return {
      ok: false,
      erro: macro
        ? `"${nome}" é um formato com macros que não aceitamos. Envie sem macros (${descreverFluxo(fluxo)}).`
        : extensao === 'xlsm'
          ? `Planilhas com macros (.xlsm) só são aceitas em demandas de automação. Envie em .xlsx.`
          : `"${nome}" não é um formato aceito. Envie: ${descreverFluxo(fluxo)}.`,
    };
  }
  // Os primeiros 64 KB bastam para a assinatura; o ZIP (Office) precisa do final do arquivo também.
  const conteudo = new Uint8Array(await arquivo.arrayBuffer());
  const formato = FORMATOS[extensao];
  let confere = false;
  try { confere = formato.confere(conteudo); } catch { confere = false; }
  if (!confere) return { ok: false, erro: `O conteúdo de "${nome}" não corresponde a um arquivo .${extensao} válido.` };
  return { ok: true, tipo: formato.tipo, aviso: formato.aviso || null, bytes: conteudo };
}

// ---------- Assinaturas ----------

const ascii = (b, inicio, fim) => String.fromCharCode(...b.subarray(inicio, Math.min(fim, b.length)));
const comeca = (b, texto) => ascii(b, 0, texto.length) === texto;
const bytes = (b, lista) => lista.every((v, i) => b[i] === v);
const ole = b => bytes(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const MARCAS_HEIF = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'];
const heif = b => ascii(b, 4, 8) === 'ftyp' && MARCAS_HEIF.includes(ascii(b, 8, 12));

// Texto puro (CSV, TXT): nada de bytes nulos, executável ou página/script disfarçados.
function texto(b) {
  const amostra = b.subarray(0, 65536);
  if (amostra.includes(0)) return false;
  if (bytes(amostra, [0x4d, 0x5a])) return false; // "MZ" (executável do Windows)
  const inicio = new TextDecoder().decode(amostra.subarray(0, 512)).replace(/^﻿/, '').trimStart().toLowerCase();
  return !/^(#!|<script|<html|<!doctype|<\?php|<svg)/.test(inicio);
}

function xml(b) {
  if (!texto(b)) return false;
  const inicio = new TextDecoder().decode(b.subarray(0, 512)).replace(/^﻿/, '').trimStart();
  return inicio.startsWith('<?xml') || /^<[A-Za-z]/.test(inicio);
}

// Nomes das entradas de um ZIP (pelo diretório central), ou null se não for um ZIP válido.
function entradasZip(b) {
  if (!bytes(b, [0x50, 0x4b, 0x03, 0x04])) return null;
  const vista = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let fim = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (vista.getUint32(i, true) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) return null;
  const total = vista.getUint16(fim + 10, true);
  let p = vista.getUint32(fim + 16, true);
  const nomes = [];
  for (let n = 0; n < total; n++) {
    if (p + 46 > b.length || vista.getUint32(p, true) !== 0x02014b50) return null;
    const tamanhoNome = vista.getUint16(p + 28, true);
    const extra = vista.getUint16(p + 30, true);
    const comentario = vista.getUint16(p + 32, true);
    nomes.push(new TextDecoder().decode(b.subarray(p + 46, p + 46 + tamanhoNome)));
    p += 46 + tamanhoNome + extra + comentario;
  }
  return nomes;
}

// Office Open XML (docx, xlsx, xlsm): ZIP com [Content_Types].xml e a pasta certa. Macros (vbaProject.bin)
// só no formato que declara macros; um .docx/.xlsx com macros dentro é recusado.
function ooxml(b, pasta, comMacro) {
  const nomes = entradasZip(b);
  if (!nomes || !nomes.includes('[Content_Types].xml') || !nomes.some(n => n.startsWith(pasta))) return false;
  const temMacro = nomes.some(n => /vbaProject\.bin$/i.test(n));
  return comMacro || !temMacro;
}

// OpenDocument (odt, ods): ZIP com o arquivo "mimetype" certo logo no começo.
function odf(b, mime) {
  const nomes = entradasZip(b);
  if (!nomes || !nomes.includes('mimetype') || !nomes.includes('content.xml')) return false;
  return ascii(b, 38, 38 + mime.length) === mime || new TextDecoder().decode(b.subarray(0, 200)).includes(mime);
}
