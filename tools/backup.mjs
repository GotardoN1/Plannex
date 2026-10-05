// Backup independente da Central: copia o banco (D1) e os arquivos (KV) para uma pasta neste computador.
// Só lê; não altera nada na Cloudflare. Cabe no plano grátis: 1 exportação do D1 e uma leitura por arquivo.
//
//   node tools/backup.mjs              -> produção (banco "plannex" e os arquivos da Central)
//   node tools/backup.mjs --env demo   -> demonstração (dados fictícios)
//
// Resultado em backups/AAAA-MM-DD_HHMM[-demo]/ (fora do git):
//   banco.sql          exportação completa do D1 (esquema e dados)
//   arquivos/          um arquivo por chave do KV (nome = chave codificada)
//   arquivos.json      lista das chaves e tamanhos
//   LEIA-ME.txt        como restaurar
//
// Usa o mesmo login do wrangler da Plannex (variáveis XDG_CONFIG_HOME e CLOUDFLARE_ACCOUNT_ID no terminal).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(import.meta.url), '../..');
const demo = process.argv.includes('--env') && process.argv[process.argv.indexOf('--env') + 1] === 'demo';
const banco = demo ? 'plannex-demo' : 'plannex';
const ambiente = demo ? ['--env', 'demo'] : [];
const agora = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 16).replace('T', '_').replace(':', '');
const pasta = join(raiz, 'backups', `${agora}${demo ? '-demo' : ''}`);
mkdirSync(join(pasta, 'arquivos'), { recursive: true });

// Chama o wrangler do projeto direto pelo Node (sem shell: as chaves dos arquivos vão como argumentos, sem risco).
const wranglerJs = join(raiz, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const wrangler = (args, opcoes = {}) => execFileSync(process.execPath, [wranglerJs, ...args], {
  cwd: raiz, encoding: opcoes.binario ? 'buffer' : 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
});

console.log(`Backup de ${demo ? 'demonstração' : 'PRODUÇÃO'} em ${pasta}`);

// 1. Banco: exportação SQL completa.
wrangler(['d1', 'export', banco, '--remote', ...ambiente, '--output', join(pasta, 'banco.sql')]);
console.log(`  banco.sql: ${(statSync(join(pasta, 'banco.sql')).size / 1024).toFixed(1)} KB`);

// 2. Arquivos: lista as chaves do KV e baixa uma por uma.
const chaves = JSON.parse(wrangler(['kv', 'key', 'list', '--binding', 'ARQUIVOS', '--remote', ...ambiente]));
const lista = [];
for (const { name } of chaves) {
  const conteudo = wrangler(['kv', 'key', 'get', name, '--binding', 'ARQUIVOS', '--remote', ...ambiente], { binario: true });
  writeFileSync(join(pasta, 'arquivos', encodeURIComponent(name)), conteudo);
  lista.push({ chave: name, bytes: conteudo.length });
}
writeFileSync(join(pasta, 'arquivos.json'), JSON.stringify(lista, null, 2));
console.log(`  arquivos: ${lista.length} (${(lista.reduce((s, a) => s + a.bytes, 0) / 1024 / 1024).toFixed(2)} MB)`);

writeFileSync(join(pasta, 'LEIA-ME.txt'), [
  `Backup ${demo ? 'da demonstração' : 'da produção'} da Central Plannex, ${agora}.`,
  '',
  'Restaurar o banco (num banco novo, para conferir antes de trocar):',
  '  npx wrangler d1 create plannex-restaurado',
  '  npx wrangler d1 execute plannex-restaurado --remote --file banco.sql',
  '',
  'Restaurar os arquivos (cada arquivo de "arquivos/" volta com a chave original, decodificada do nome):',
  '  npx wrangler kv key put "<chave>" --path "arquivos/<nome do arquivo>" --binding ARQUIVOS --remote',
  '',
  'Guarde esta pasta fora do computador também (HD externo ou nuvem da empresa). Contém dados pessoais:',
  'trate como documento sigiloso.',
].join('\n'));
console.log('Pronto.');
