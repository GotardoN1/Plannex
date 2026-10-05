// 2. Excluir anotação: só a própria e só enquanto ainda vê a demanda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAmbiente, chamar, entrar } from './apoio.mjs';

// Anotação fictícia de "usuarioId" na demanda "contatoId".
const anotar = (banco, contatoId, usuarioId, texto = 'anotação fictícia') =>
  Number(banco.prepare("INSERT INTO notas (contato_id, usuario_id, tipo, texto) VALUES (?, ?, 'nota', ?)").run(contatoId, usuarioId, texto).lastInsertRowid);
const existe = (banco, id) => Boolean(banco.prepare('SELECT 1 FROM notas WHERE id = ?').get(id));

test('funcionário responsável apaga a própria anotação', async () => {
  const { env, banco } = await criarAmbiente();
  const id = anotar(banco, 10, 2);
  const r = await chamar(env, 'DELETE', `/api/notas/${id}`, { cookie: await entrar(env, 'bia') });
  assert.equal(r.status, 200);
  assert.equal(existe(banco, id), false);
});

test('ex-responsável (demanda reatribuída) não apaga mais a anotação', async () => {
  const { env, banco } = await criarAmbiente();
  const id = anotar(banco, 10, 2);
  banco.prepare('UPDATE contatos SET responsavel_id = 3 WHERE id = 10').run();
  const r = await chamar(env, 'DELETE', `/api/notas/${id}`, { cookie: await entrar(env, 'bia') });
  assert.equal(r.status, 404);
  assert.equal(existe(banco, id), true);
});

test('responsável de uma demanda arquivada não apaga a anotação', async () => {
  const { env, banco } = await criarAmbiente();
  const id = anotar(banco, 10, 2);
  banco.prepare("UPDATE contatos SET arquivado_em = '2026-10-01T00:00:00Z' WHERE id = 10").run();
  const r = await chamar(env, 'DELETE', `/api/notas/${id}`, { cookie: await entrar(env, 'bia') });
  assert.equal(r.status, 404);
  assert.equal(existe(banco, id), true);
});

test('funcionário não apaga anotação de outra pessoa (nem na demanda dele)', async () => {
  const { env, banco } = await criarAmbiente();
  const daAna = anotar(banco, 10, 1);
  const r = await chamar(env, 'DELETE', `/api/notas/${daAna}`, { cookie: await entrar(env, 'bia') });
  assert.equal(r.status, 403);
  assert.equal(existe(banco, daAna), true);
  // Nem a do colega, numa demanda que não é dele.
  const doCaio = anotar(banco, 20, 3);
  const r2 = await chamar(env, 'DELETE', `/api/notas/${doCaio}`, { cookie: await entrar(env, 'bia') });
  assert.equal(r2.status, 404);
  assert.equal(existe(banco, doCaio), true);
});

test('administrador apaga a própria anotação; a de outra pessoa continua protegida (regra atual)', async () => {
  const { env, banco } = await criarAmbiente();
  const cookie = await entrar(env, 'ana');
  const propria = anotar(banco, 20, 1);
  assert.equal((await chamar(env, 'DELETE', `/api/notas/${propria}`, { cookie })).status, 200);
  assert.equal(existe(banco, propria), false);
  const daBia = anotar(banco, 10, 2);
  assert.equal((await chamar(env, 'DELETE', `/api/notas/${daBia}`, { cookie })).status, 403);
  assert.equal(existe(banco, daBia), true);
});

test('ID inexistente responde 404', async () => {
  const { env } = await criarAmbiente();
  const r = await chamar(env, 'DELETE', '/api/notas/999999', { cookie: await entrar(env, 'bia') });
  assert.equal(r.status, 404);
});

test('sem login responde 401', async () => {
  const { env, banco } = await criarAmbiente();
  const id = anotar(banco, 10, 2);
  assert.equal((await chamar(env, 'DELETE', `/api/notas/${id}`)).status, 401);
  assert.equal(existe(banco, id), true);
});
