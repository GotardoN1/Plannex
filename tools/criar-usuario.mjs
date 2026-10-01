// Cria um usuário do painel, ou troca a senha de um que já existe.
//
//   npm run usuario -- <usuario> "<Nome de exibição>"         (banco no Cloudflare)
//   npm run usuario:local -- <usuario> "<Nome de exibição>"   (banco do wrangler dev)
//
// A senha é pedida no terminal e não aparece na tela. Só o hash vai para o banco.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarHashSenha } from '../src/senha.js';

const args = process.argv.slice(2);
const destino = args.includes('--local') ? '--local' : '--remote';
const [usuario, nome] = args.filter(a => !a.startsWith('--'));

if (!usuario || !/^[a-z0-9._-]{3,60}$/i.test(usuario)) {
  console.error('Uso: npm run usuario -- <usuario> "<Nome de exibição>"');
  console.error('O usuário aceita letras, números, ponto, hífen e sublinhado (3 a 60).');
  process.exit(1);
}

const senha = process.env.PLANNEX_SENHA || await perguntarSenha();
if (senha.length < 10) {
  console.error('A senha precisa ter pelo menos 10 caracteres.');
  process.exit(1);
}

const texto = valor => `'${String(valor).replace(/'/g, "''")}'`;
const hash = await gerarHashSenha(senha);
const sql = `INSERT INTO usuarios (usuario, nome, senha_hash) VALUES (${texto(usuario.toLowerCase())}, ${texto(nome || usuario)}, ${texto(hash)})
ON CONFLICT (usuario) DO UPDATE SET senha_hash = excluded.senha_hash${nome ? ', nome = excluded.nome' : ''};
DELETE FROM sessoes WHERE usuario_id = (SELECT id FROM usuarios WHERE usuario = ${texto(usuario.toLowerCase())});`;

const pasta = mkdtempSync(join(tmpdir(), 'plannex-'));
const arquivo = join(pasta, 'usuario.sql');
writeFileSync(arquivo, sql);
const resultado = spawnSync('npx', ['wrangler', 'd1', 'execute', 'plannex', destino, '--yes', '--file', `"${arquivo}"`], {
  stdio: 'inherit',
  shell: true,
  // Roda o wrangler na raiz do projeto, onde está o wrangler.jsonc, de qualquer pasta.
  cwd: resolve(fileURLToPath(import.meta.url), '../..'),
});
rmSync(pasta, { recursive: true, force: true });

if (resultado.status === 0) console.log(`\nUsuário "${usuario.toLowerCase()}" pronto (${destino === '--local' ? 'banco local' : 'Cloudflare'}).`);
process.exit(resultado.status ?? 1);

async function perguntarSenha() {
  const primeira = await lerOculto('Senha (mín. 10 caracteres): ');
  const segunda = await lerOculto('Repita a senha: ');
  if (primeira !== segunda) {
    console.error('As senhas não conferem.');
    process.exit(1);
  }
  return primeira;
}

function lerOculto(pergunta) {
  return new Promise(resolve => {
    const { stdin, stdout } = process;
    stdout.write(pergunta);
    if (!stdin.isTTY) {
      stdin.once('data', d => resolve(String(d).trim()));
      return;
    }
    let valor = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const aoDigitar = tecla => {
      if (tecla === '\u0003') process.exit(1);
      if (tecla === '\r' || tecla === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off('data', aoDigitar);
        stdout.write('\n');
        resolve(valor);
      } else if (tecla === '\u007f' || tecla === '\b') {
        valor = valor.slice(0, -1);
      } else {
        valor += tecla;
      }
    };
    stdin.on('data', aoDigitar);
  });
}
