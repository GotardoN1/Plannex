// ZIP simples (sem compressão), feito no navegador: junta os arquivos da entrega num só para enviar ao
// cliente. Documentos, planilhas e PDFs já vêm comprimidos, então "guardar" (método 0) basta.

const TABELA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELA[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Data e hora no formato do DOS, como o ZIP guarda.
function dataDos(d) {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const dia = ((Math.max(d.getFullYear(), 1980) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return [hora, dia];
}

// arquivos: [{ nome, bytes: Uint8Array, data?: Date }] → Blob do ZIP. Nomes repetidos ganham (2), (3)…
// "pastas": mantém as barras do nome (pasta/arquivo), sem permitir "..".
export function criarZip(arquivos, { pastas = false } = {}) {
  const codificar = new TextEncoder();
  const usados = new Map();
  const locais = [];
  const centrais = [];
  let deslocamento = 0;

  for (const arquivo of arquivos) {
    let nome = pastas
      ? arquivo.nome.split('/').filter(parte => parte && parte !== '..').map(parte => parte.replace(/[\\:*?"<>|]+/g, '-')).join('/')
      : arquivo.nome.replace(/[\\/:*?"<>|]+/g, '-');
    const vezes = usados.get(nome.toLowerCase()) || 0;
    usados.set(nome.toLowerCase(), vezes + 1);
    if (vezes) nome = nome.replace(/(\.[^.]*)?$/, ext => ` (${vezes + 1})${ext || ''}`);
    const nomeBytes = codificar.encode(nome);
    const bytes = arquivo.bytes;
    const crc = crc32(bytes);
    const [hora, dia] = dataDos(arquivo.data || new Date());

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nome em UTF-8
    local.setUint16(8, 0, true);
    local.setUint16(10, hora, true);
    local.setUint16(12, dia, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, bytes.length, true);
    local.setUint32(22, bytes.length, true);
    local.setUint16(26, nomeBytes.length, true);
    local.setUint16(28, 0, true);
    locais.push(local, nomeBytes, bytes);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, hora, true);
    central.setUint16(14, dia, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, bytes.length, true);
    central.setUint32(24, bytes.length, true);
    central.setUint16(28, nomeBytes.length, true);
    central.setUint32(42, deslocamento, true);
    centrais.push(central, nomeBytes);

    deslocamento += 30 + nomeBytes.length + bytes.length;
  }

  const tamanhoCentral = centrais.reduce((soma, parte) => soma + parte.byteLength, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, arquivos.length, true);
  fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamanhoCentral, true);
  fim.setUint32(16, deslocamento, true);
  return new Blob([...locais, ...centrais, fim], { type: 'application/zip' });
}
