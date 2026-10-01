// Hash de senha com PBKDF2-SHA256. Usado pelo Worker e pelo tools/criar-usuario.mjs,
// por isso só depende da Web Crypto (existe nos dois).

// O Workers aceita no máximo 100 mil iterações de PBKDF2.
const PBKDF2_ITERACOES = 100000;

export const HASH_FALSO = `pbkdf2-sha256$${PBKDF2_ITERACOES}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

export async function gerarHashSenha(senha) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(senha, sal, PBKDF2_ITERACOES);
  return `pbkdf2-sha256$${PBKDF2_ITERACOES}$${base64(sal)}$${base64(hash)}`;
}

export async function conferirSenha(senha, guardado) {
  const [algoritmo, iteracoes, sal, hash] = String(guardado).split('$');
  if (algoritmo !== 'pbkdf2-sha256') return false;
  const calculado = await pbkdf2(senha, deBase64(sal), Number(iteracoes));
  return iguaisTempoConstante(calculado, deBase64(hash));
}

async function pbkdf2(senha, sal, iteracoes) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes }, chave, 256);
  return new Uint8Array(bits);
}

function iguaisTempoConstante(a, b) {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a[i] ^ b[i];
  return diferenca === 0;
}

export function base64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function deBase64(texto) {
  return Uint8Array.from(atob(texto || ''), c => c.charCodeAt(0));
}
