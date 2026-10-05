// Recursos simulados do Cloudflare para rodar o src/index.js no Node: D1 (pelo node:sqlite), KV (em
// arquivos ou em memória) e os arquivos estáticos de public/ (com os cabeçalhos do _headers e a 404).
// Usado pela prévia (tools/servidor-local.mjs) e pelos testes (tests/).
import { mkdirSync, readFileSync, readdirSync, existsSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export const raiz = resolve(fileURLToPath(import.meta.url), '../..');
const pastaPublica = join(raiz, 'public');

// D1: arquivo SQLite (ou ':memory:') com as migrações aplicadas.
export function criarD1(caminho = ':memory:') {
  const banco = new DatabaseSync(caminho);
  banco.exec('PRAGMA foreign_keys = ON; CREATE TABLE IF NOT EXISTS _migracoes (nome TEXT PRIMARY KEY)');
  for (const arquivo of readdirSync(join(raiz, 'migrations')).filter(n => n.endsWith('.sql')).sort()) {
    if (banco.prepare('SELECT 1 FROM _migracoes WHERE nome = ?').get(arquivo)) continue;
    banco.exec(readFileSync(join(raiz, 'migrations', arquivo), 'utf8'));
    banco.prepare('INSERT INTO _migracoes (nome) VALUES (?)').run(arquivo);
  }
  // Mesmo formato de chamadas do D1 que o Worker usa: prepare().bind().first()/all()/run() e batch().
  class Consulta {
    constructor(sql, valores = []) { this.sql = sql; this.valores = valores; }
    bind(...valores) { return new Consulta(this.sql, valores); }
    async first() { return banco.prepare(this.sql).get(...this.valores) ?? null; }
    async all() { return { results: banco.prepare(this.sql).all(...this.valores) }; }
    async run() { banco.prepare(this.sql).run(...this.valores); return { success: true }; }
  }
  const DB = {
    prepare: sql => new Consulta(sql),
    // Como no D1: tudo numa transação, devolvendo os resultados de cada consulta.
    async batch(consultas) {
      banco.exec('BEGIN');
      try {
        const resultados = [];
        for (const c of consultas) resultados.push(await c.all());
        banco.exec('COMMIT');
        return resultados;
      } catch (erro) {
        banco.exec('ROLLBACK');
        throw erro;
      }
    },
  };
  return { DB, banco };
}

// KV: cada chave vira um arquivo na pasta (ou fica num Map, sem pasta). get() sem tipo devolve texto, como no KV.
export function criarKv(pasta = null) {
  const memoria = new Map();
  if (pasta) mkdirSync(pasta, { recursive: true });
  const caminho = chave => join(pasta, encodeURIComponent(chave));
  const ler = chave => (pasta ? (existsSync(caminho(chave)) ? readFileSync(caminho(chave)) : null) : memoria.get(chave) ?? null);
  return {
    chaves: () => (pasta ? readdirSync(pasta).map(decodeURIComponent) : [...memoria.keys()]),
    async put(chave, valor) {
      const conteudo = typeof valor === 'string' ? Buffer.from(valor) : Buffer.from(valor instanceof ArrayBuffer ? new Uint8Array(valor) : valor);
      if (pasta) writeFileSync(caminho(chave), conteudo);
      else memoria.set(chave, conteudo);
    },
    async get(chave, opcoes = {}) {
      const conteudo = ler(chave);
      if (conteudo === null) return null;
      if (opcoes.type === 'stream') return new Blob([conteudo]).stream();
      if (opcoes.type === 'arrayBuffer') return conteudo.buffer.slice(conteudo.byteOffset, conteudo.byteOffset + conteudo.byteLength);
      return conteudo.toString('utf8');
    },
    async delete(chave) {
      if (pasta) rmSync(caminho(chave), { force: true });
      else memoria.delete(chave);
    },
  };
}

// Cabeçalhos do _headers, para a prévia se comportar como o Cloudflare (inclusive a CSP).
const regras = [];
for (const bloco of readFileSync(join(pastaPublica, '_headers'), 'utf8').split(/\r?\n(?=\S)/)) {
  const [caminho, ...linhas] = bloco.split(/\r?\n/).filter(l => l.trim());
  if (!caminho) continue;
  const padrao = new RegExp('^' + caminho.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  regras.push([padrao, linhas.map(l => l.trim()).map(l => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()])]);
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
};

export const ASSETS = {
  async fetch(request) {
    const url = new URL(request.url);
    let caminho = decodeURIComponent(url.pathname);
    if (caminho.endsWith('/')) caminho += 'index.html';
    let arquivo = normalize(join(pastaPublica, caminho));
    // Como no Cloudflare: "/privacidade" acha "privacidade.html".
    if (!existsSync(arquivo) && existsSync(`${arquivo}.html`)) arquivo = `${arquivo}.html`;
    let status = 200;
    if (!arquivo.startsWith(pastaPublica) || !existsSync(arquivo) || statSync(arquivo).isDirectory()) {
      // not_found_handling = "404-page": a página 404.html, com status 404.
      arquivo = join(pastaPublica, '404.html');
      status = 404;
      if (!existsSync(arquivo)) return new Response('Não encontrado', { status: 404 });
    }
    const headers = new Headers({ 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream' });
    for (const [padrao, cabecalhos] of regras) {
      if (padrao.test(url.pathname) || padrao.test(caminho)) for (const [k, v] of cabecalhos) headers.set(k, v);
    }
    // Em http://localhost o upgrade-insecure-requests quebraria a prévia.
    const csp = headers.get('Content-Security-Policy');
    if (csp) headers.set('Content-Security-Policy', csp.replace(/;\s*upgrade-insecure-requests/, ''));
    headers.delete('Strict-Transport-Security');
    return new Response(readFileSync(arquivo), { status, headers });
  },
};
