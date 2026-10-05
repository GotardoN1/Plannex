// Prévia local sem o workerd: roda o mesmo src/index.js no Node, com o D1 simulado
// pelo SQLite do próprio Node (node:sqlite) e os arquivos de public/ servidos direto.
//
//   node tools/servidor-local.mjs            -> http://localhost:5330
//   PLANNEX_DEMO=1 node tools/servidor-local.mjs   -> demonstração (banco e arquivos próprios)
//   PLANNEX_SENHA=... node tools/servidor-local.mjs --usuario fulano "Nome"   (cria usuário no banco local)
//
// O banco fica em .wrangler/previa.sqlite (ignorado pelo git).
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import worker from '../src/index.js';
import { gerarHashSenha } from '../src/senha.js';
import { raiz, criarD1, criarKv, ASSETS } from './ambiente-local.mjs';

const PORTA = Number(process.env.PORT || 5330);
// PLANNEX_DEMO=1 roda como o Worker de demonstração, com banco e arquivos próprios.
const DEMO = process.env.PLANNEX_DEMO === '1';
const sufixo = DEMO ? '-demo' : '';

mkdirSync(join(raiz, '.wrangler'), { recursive: true });
const { DB, banco } = criarD1(join(raiz, '.wrangler', `previa${sufixo}.sqlite`));
const ARQUIVOS = criarKv(join(raiz, '.wrangler', `kv-previa${sufixo}`));

// Na demonstração local, marca o banco e os arquivos locais da demo (como faz o "npm run deploy:demo").
if (DEMO) {
  banco.prepare("INSERT INTO ambiente (chave, valor) VALUES ('ambiente', 'demo') ON CONFLICT (chave) DO UPDATE SET valor = 'demo'").run();
  await ARQUIVOS.put('ambiente', 'demo');
}

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

const env = { DB, ASSETS, ARQUIVOS, AMBIENTE: DEMO ? 'demo' : 'producao', ...(DEMO ? { DEMO: 'true' } : {}) };

createServer(async (req, res) => {
  const corpo = ['GET', 'HEAD'].includes(req.method) ? undefined : await new Promise(ok => {
    const partes = [];
    req.on('data', p => partes.push(p)).on('end', () => ok(Buffer.concat(partes)));
  });
  const request = new Request(`http://localhost:${PORTA}${req.url}`, { method: req.method, headers: req.headers, body: corpo, duplex: 'half' });
  const resposta = await worker.fetch(request, env);
  const cabecalhos = Object.fromEntries(resposta.headers);
  // O cookie Secure não pega em http no Node; na prévia ele sai sem a flag.
  if (cabecalhos['set-cookie']) cabecalhos['set-cookie'] = cabecalhos['set-cookie'].replace('; Secure', '');
  res.writeHead(resposta.status, cabecalhos);
  res.end(Buffer.from(await resposta.arrayBuffer()));
}).listen(PORTA, () => console.log(`Prévia da Plannex${DEMO ? ' (demonstração)' : ''} em http://localhost:${PORTA} (painel em /painel/)`));
