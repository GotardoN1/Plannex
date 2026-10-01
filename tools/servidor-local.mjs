// Prévia local sem o workerd: roda o mesmo src/index.js no Node, com o D1 simulado
// pelo SQLite do próprio Node (node:sqlite) e os arquivos de public/ servidos direto.
//
//   node tools/servidor-local.mjs            -> http://localhost:5330
//   PLANNEX_SENHA=... node tools/servidor-local.mjs --usuario fulano "Nome"   (cria usuário no banco local)
//
// O banco fica em .wrangler/previa.sqlite (ignorado pelo git).
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import worker from '../src/index.js';
import { gerarHashSenha } from '../src/senha.js';

const raiz = resolve(fileURLToPath(import.meta.url), '../..');
const pastaPublica = join(raiz, 'public');
const PORTA = Number(process.env.PORT || 5330);

mkdirSync(join(raiz, '.wrangler'), { recursive: true });
const banco = new DatabaseSync(join(raiz, '.wrangler', 'previa.sqlite'));
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
  async batch(consultas) {
    banco.exec('BEGIN');
    try {
      for (const c of consultas) await c.run();
      banco.exec('COMMIT');
    } catch (erro) {
      banco.exec('ROLLBACK');
      throw erro;
    }
  },
};

const args = process.argv.slice(2);
if (args[0] === '--usuario') {
  const [, usuario, nome] = args;
  if (!usuario || !process.env.PLANNEX_SENHA) {
    console.error('Uso: PLANNEX_SENHA=... node tools/servidor-local.mjs --usuario <usuario> "<Nome>"');
    process.exit(1);
  }
  banco.prepare(`INSERT INTO usuarios (usuario, nome, senha_hash) VALUES (?, ?, ?)
    ON CONFLICT (usuario) DO UPDATE SET senha_hash = excluded.senha_hash, nome = excluded.nome`)
    .run(usuario.toLowerCase(), nome || usuario, await gerarHashSenha(process.env.PLANNEX_SENHA));
  console.log(`Usuário "${usuario.toLowerCase()}" pronto no banco local.`);
  process.exit(0);
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
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
};

const ASSETS = {
  async fetch(request) {
    const url = new URL(request.url);
    let caminho = decodeURIComponent(url.pathname);
    if (caminho.endsWith('/')) caminho += 'index.html';
    const arquivo = normalize(join(pastaPublica, caminho));
    if (!arquivo.startsWith(pastaPublica) || !existsSync(arquivo) || statSync(arquivo).isDirectory()) {
      return new Response('Não encontrado', { status: 404 });
    }
    const headers = new Headers({ 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream' });
    for (const [padrao, cabecalhos] of regras) {
      if (padrao.test(url.pathname) || padrao.test(caminho)) for (const [k, v] of cabecalhos) headers.set(k, v);
    }
    // Em http://localhost o upgrade-insecure-requests quebraria a prévia.
    const csp = headers.get('Content-Security-Policy');
    if (csp) headers.set('Content-Security-Policy', csp.replace(/;\s*upgrade-insecure-requests/, ''));
    headers.delete('Strict-Transport-Security');
    return new Response(readFileSync(arquivo), { headers });
  },
};

createServer(async (req, res) => {
  const corpo = ['GET', 'HEAD'].includes(req.method) ? undefined : await new Promise(ok => {
    const partes = [];
    req.on('data', p => partes.push(p)).on('end', () => ok(Buffer.concat(partes)));
  });
  const request = new Request(`http://localhost:${PORTA}${req.url}`, { method: req.method, headers: req.headers, body: corpo });
  const resposta = await worker.fetch(request, { DB, ASSETS });
  const cabecalhos = Object.fromEntries(resposta.headers);
  // O cookie Secure não pega em http no Node; na prévia ele sai sem a flag.
  if (cabecalhos['set-cookie']) cabecalhos['set-cookie'] = cabecalhos['set-cookie'].replace('; Secure', '');
  res.writeHead(resposta.status, cabecalhos);
  res.end(Buffer.from(await resposta.arrayBuffer()));
}).listen(PORTA, () => console.log(`Prévia da Plannex em http://localhost:${PORTA} (painel em /painel/)`));
