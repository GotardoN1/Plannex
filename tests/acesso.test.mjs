// 3. /api/central conforme o papel e isolamento do funcionário (busca, URL direta e API);
// sessão: login, saída, expiração e rotas sem login.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAmbiente, chamar, entrar, EQUIPE } from './apoio.mjs';

test('administrador recebe a equipe toda na /api/central', async () => {
  const { env } = await criarAmbiente();
  const r = await chamar(env, 'GET', '/api/central', { cookie: await entrar(env, 'ana') });
  assert.equal(r.status, 200);
  assert.equal(r.dados.usuarios.length, Object.keys(EQUIPE).length);
  assert.ok(r.dados.usuarios.every(u => 'usuario' in u && 'area' in u && 'papel' in u));
  assert.equal(r.dados.contatos.length, 4);
});

test('funcionário recebe só ele mesmo (sem a equipe) e só as demandas dele', async () => {
  const { env } = await criarAmbiente();
  const r = await chamar(env, 'GET', '/api/central', { cookie: await entrar(env, 'bia') });
  assert.equal(r.status, 200);
  assert.deepEqual(r.dados.usuarios.map(u => u.id), [2]);
  assert.deepEqual(Object.keys(r.dados.usuarios[0]).sort(), ['apelido', 'id', 'nome', 'papel']);
  assert.ok(!JSON.stringify(r.dados.usuarios).includes('Caio'));
  assert.ok(!JSON.stringify(r.dados.usuarios).includes('Ana'));
  assert.deepEqual(r.dados.contatos.map(c => c.id).sort(), [10, 11]);
  // Contato e dinheiro do cliente ficam com o administrador.
  for (const c of r.dados.contatos) {
    assert.equal(c.telefone, null);
    assert.equal(c.email, null);
    assert.equal(c.cpf, null);
    assert.equal(c.valor_centavos, null);
  }
});

test('funcionário não chega à demanda de outro por URL direta nem pela API', async () => {
  const { env, banco, ARQUIVOS } = await criarAmbiente();
  await ARQUIVOS.put('contato/20/doc', '%PDF-1.4 fictício');
  const arquivo = Number(banco.prepare("INSERT INTO arquivos (contato_id, categoria, nome, tipo, tamanho, chave) VALUES (20, 'cliente', 'doc.pdf', 'application/pdf', 17, 'contato/20/doc')").run().lastInsertRowid);
  const cookie = await entrar(env, 'bia');
  for (const [metodo, caminho, corpo] of [
    ['PATCH', '/api/contatos/20', { lido: true }],
    ['GET', '/api/contatos/20/linha-do-tempo'],
    ['GET', '/api/contatos/20/arquivos'],
    ['POST', '/api/contatos/20/notas', { texto: 'x' }],
    ['POST', '/api/contatos/20/etiquetas', { texto: 'x', cor: 'azul' }],
    ['GET', `/api/arquivos/${arquivo}`],
    ['DELETE', `/api/arquivos/${arquivo}`],
    ['GET', '/api/contatos/30/linha-do-tempo'], // caixa de entrada (sem responsável)
  ]) {
    const r = await chamar(env, metodo, caminho, { cookie, corpo });
    assert.equal(r.status, 404, `${metodo} ${caminho} deveria ser 404, veio ${r.status}`);
  }
  // A atividade recente dele não mostra nada das demandas alheias.
  banco.prepare("INSERT INTO notas (contato_id, usuario_id, tipo, texto) VALUES (20, 3, 'nota', 'segredo do Caio')").run();
  const atividade = await chamar(env, 'GET', '/api/atividade?limite=50', { cookie });
  assert.ok(!atividade.texto.includes('segredo do Caio'));
  assert.ok(!atividade.texto.includes('Cliente 20'));
  // Rotas de administrador.
  for (const [metodo, caminho] of [['POST', '/api/usuarios'], ['PATCH', '/api/usuarios/3'], ['POST', '/api/contatos'], ['GET', '/api/moldes/ordem']]) {
    const r = await chamar(env, metodo, caminho, { cookie, corpo: {} });
    assert.ok([403, 404].includes(r.status), `${metodo} ${caminho} deveria ser negado, veio ${r.status}`);
  }
});

test('sem login: API responde 401 (inclusive download de arquivo)', async () => {
  const { env, banco, ARQUIVOS } = await criarAmbiente();
  await ARQUIVOS.put('contato/10/doc', 'x');
  const arquivo = Number(banco.prepare("INSERT INTO arquivos (contato_id, categoria, nome, tipo, tamanho, chave) VALUES (10, 'cliente', 'doc.pdf', 'application/pdf', 1, 'contato/10/doc')").run().lastInsertRowid);
  for (const caminho of ['/api/central', `/api/arquivos/${arquivo}`, '/api/contatos/10/arquivos', '/api/materiais/1', '/api/moldes/relatorio']) {
    assert.equal((await chamar(env, 'GET', caminho)).status, 401, caminho);
  }
});

test('escrita vinda de outra origem é recusada (403)', async () => {
  const { env } = await criarAmbiente();
  const cookie = await entrar(env, 'ana');
  const r = await chamar(env, 'PATCH', '/api/contatos/10', { cookie, corpo: { lido: true }, origem: 'https://outro-site.exemplo' });
  assert.equal(r.status, 403);
});

test('sair apaga a sessão no servidor: o mesmo cookie deixa de valer', async () => {
  const { env, banco } = await criarAmbiente();
  const cookie = await entrar(env, 'ana');
  assert.equal((await chamar(env, 'GET', '/api/central', { cookie })).status, 200);
  const saida = await chamar(env, 'POST', '/api/sair', { cookie });
  assert.equal(saida.status, 200);
  assert.match(saida.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 0);
  assert.equal((await chamar(env, 'GET', '/api/central', { cookie })).status, 401);
});

test('sessão vencida não vale; o cookie é HttpOnly, Secure e SameSite=Strict', async () => {
  const { env, banco } = await criarAmbiente();
  const r = await chamar(env, 'POST', '/api/login', { corpo: { usuario: 'ana', senha: 'senha-de-teste-123' } });
  const setCookie = r.headers.get('Set-Cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Strict/);
  const cookie = setCookie.split(';')[0];
  banco.prepare("UPDATE sessoes SET expira_em = '2000-01-01T00:00:00Z'").run();
  assert.equal((await chamar(env, 'GET', '/api/central', { cookie })).status, 401);
});

test('senha errada repetida trava o login (5 em 15 minutos)', async () => {
  const { env } = await criarAmbiente();
  for (let i = 0; i < 5; i++) assert.equal((await chamar(env, 'POST', '/api/login', { corpo: { usuario: 'ana', senha: 'errada' } })).status, 401);
  assert.equal((await chamar(env, 'POST', '/api/login', { corpo: { usuario: 'ana', senha: 'senha-de-teste-123' } })).status, 429);
});

test('troca de senha só para administrador em outra conta; funcionário não redefine senha alheia', async () => {
  const { env } = await criarAmbiente();
  const r = await chamar(env, 'POST', '/api/usuarios/1/senha', { cookie: await entrar(env, 'bia'), corpo: { senha: 'nova-senha-123456' } });
  assert.equal(r.status, 403);
});
