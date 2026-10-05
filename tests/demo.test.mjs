// 1. Modo demonstração: só liga com o Worker da demo E com o banco e os arquivos marcados como demo.
// Em qualquer outro caso, /api/demo/* responde 404 e nada dos dados reais é apagado ou alterado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { resetarDemo } from '../src/demo.js';
import { criarAmbiente, chamar } from './apoio.mjs';

const ROTAS_DEMO = [['GET', '/api/demo/perfis'], ['POST', '/api/demo/entrar'], ['POST', '/api/demo/reiniciar']];

// Retrato dos dados "reais" do ambiente, para comparar antes e depois.
const retrato = async ({ banco, ARQUIVOS }) => JSON.stringify({
  usuarios: banco.prepare('SELECT id, usuario, nome, papel FROM usuarios ORDER BY id').all(),
  contatos: banco.prepare('SELECT id, nome, etapa, responsavel_id FROM contatos ORDER BY id').all(),
  sessoes: banco.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n,
  chaves: ARQUIVOS.chaves().sort(),
});

async function prepararArquivoReal(amb) {
  await amb.ARQUIVOS.put('contato/10/real', 'conteúdo real');
  amb.banco.prepare("INSERT INTO arquivos (contato_id, categoria, nome, tipo, tamanho, chave) VALUES (10, 'cliente', 'real.pdf', 'application/pdf', 13, 'contato/10/real')").run();
}

async function tentarTudo(env) {
  const respostas = [];
  for (const [metodo, caminho] of ROTAS_DEMO) {
    respostas.push((await chamar(env, metodo, caminho, { corpo: metodo === 'POST' ? { usuario: 'carla' } : undefined })).status);
  }
  // Rotina diária (que na demo reinicia os dados).
  await worker.scheduled({}, env);
  return respostas;
}

test('produção (sem DEMO): /api/demo/* responde 404 e nada muda', async () => {
  const amb = await criarAmbiente();
  await prepararArquivoReal(amb);
  const antes = await retrato(amb);
  assert.deepEqual(await tentarTudo(amb.env), [404, 404, 404]);
  assert.equal(await retrato(amb), antes);
});

test('DEMO=true no Worker de produção (AMBIENTE=producao) é recusado: 404 e nada muda', async () => {
  const amb = await criarAmbiente({ DEMO: 'true', AMBIENTE: 'producao' });
  await prepararArquivoReal(amb);
  // Mesmo com os recursos marcados por engano, o Worker de produção recusa a demonstração.
  amb.banco.prepare("INSERT INTO ambiente (chave, valor) VALUES ('ambiente', 'demo')").run();
  await amb.ARQUIVOS.put('ambiente', 'demo');
  const antes = await retrato(amb);
  assert.deepEqual(await tentarTudo(amb.env), [404, 404, 404]);
  assert.equal(await retrato(amb), antes);
});

test('DEMO=true sem AMBIENTE definido é recusado', async () => {
  const amb = await criarAmbiente({ DEMO: 'true', AMBIENTE: undefined });
  amb.banco.prepare("INSERT INTO ambiente (chave, valor) VALUES ('ambiente', 'demo')").run();
  await amb.ARQUIVOS.put('ambiente', 'demo');
  const antes = await retrato(amb);
  assert.deepEqual(await tentarTudo(amb.env), [404, 404, 404]);
  assert.equal(await retrato(amb), antes);
});

test('Worker da demo ligado ao banco real (sem a marca demo): 404 e nada muda', async () => {
  const amb = await criarAmbiente({ DEMO: 'true', AMBIENTE: 'demo' });
  await prepararArquivoReal(amb);
  await amb.ARQUIVOS.put('ambiente', 'demo'); // só o armazenamento marcado
  const antes = await retrato(amb);
  assert.deepEqual(await tentarTudo(amb.env), [404, 404, 404]);
  assert.equal(await retrato(amb), antes);
});

test('Worker da demo ligado ao armazenamento real (sem a marca demo): 404 e nada muda', async () => {
  const amb = await criarAmbiente({ DEMO: 'true', AMBIENTE: 'demo' });
  await prepararArquivoReal(amb);
  amb.banco.prepare("INSERT INTO ambiente (chave, valor) VALUES ('ambiente', 'demo')").run(); // só o banco marcado
  const antes = await retrato(amb);
  assert.deepEqual(await tentarTudo(amb.env), [404, 404, 404]);
  assert.equal(await retrato(amb), antes);
});

test('marca com outro valor (ex.: producao) também desliga a demonstração', async () => {
  const amb = await criarAmbiente({ DEMO: 'true', AMBIENTE: 'demo' });
  amb.banco.prepare("INSERT INTO ambiente (chave, valor) VALUES ('ambiente', 'producao')").run();
  await amb.ARQUIVOS.put('ambiente', 'demo');
  const antes = await retrato(amb);
  assert.deepEqual(await tentarTudo(amb.env), [404, 404, 404]);
  assert.equal(await retrato(amb), antes);
});

test('na demo não confirmada, o login por senha continua o normal (sem perfis sem senha)', async () => {
  const amb = await criarAmbiente({ DEMO: 'true', AMBIENTE: 'demo' });
  const semSenha = await chamar(amb.env, 'POST', '/api/login', { corpo: { usuario: 'ana', senha: 'errada' } });
  assert.equal(semSenha.status, 401);
});

test('resetarDemo chamado direto, sem a demonstração confirmada, não apaga nada', async () => {
  const amb = await criarAmbiente({ DEMO: 'true', AMBIENTE: 'demo' });
  await prepararArquivoReal(amb);
  const antes = await retrato(amb);
  await assert.rejects(resetarDemo(amb.env), /recusado/);
  await assert.rejects(resetarDemo({ ...amb.env, DEMO_ATIVA: 'true' }), /recusado/);
  assert.equal(await retrato(amb), antes);
});

test('demonstração confirmada (Worker demo + banco e arquivos marcados): perfis, entrada e reinício funcionam', async () => {
  const amb = await criarAmbiente({ DEMO: 'true', AMBIENTE: 'demo' }, { semDados: true });
  amb.banco.prepare("INSERT INTO ambiente (chave, valor) VALUES ('ambiente', 'demo')").run();
  await amb.ARQUIVOS.put('ambiente', 'demo');
  const perfis = await chamar(amb.env, 'GET', '/api/demo/perfis');
  assert.equal(perfis.status, 200);
  assert.ok(perfis.dados.perfis.length >= 3);
  const entrada = await chamar(amb.env, 'POST', '/api/demo/entrar', { corpo: { usuario: 'carla' } });
  assert.equal(entrada.status, 200);
  const cookie = entrada.headers.get('Set-Cookie').split(';')[0];
  const reinicio = await chamar(amb.env, 'POST', '/api/demo/reiniciar', { cookie });
  assert.equal(reinicio.status, 200);
  // As marcas continuam lá depois do reinício (a demo segue ligada).
  assert.equal(amb.banco.prepare("SELECT valor FROM ambiente WHERE chave = 'ambiente'").get().valor, 'demo');
  assert.equal(await amb.ARQUIVOS.get('ambiente'), 'demo');
  // E o robots.txt da demonstração pede para não indexar.
  const robots = await chamar(amb.env, 'GET', '/robots.txt');
  assert.match(robots.texto, /Disallow: \//);
});
