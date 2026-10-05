// Endereços limpos do site (sem "#"): cada caminho entrega a página certa; o resto é 404.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAmbiente, chamar } from './apoio.mjs';

test('caminhos do site entregam a página única', async () => {
  const { env } = await criarAmbiente();
  for (const caminho of ['/', '/automacao', '/contato', '/calculos', '/como-funciona', '/formas-de-contratacao', '/planos-de-automacao', '/automacao/']) {
    const r = await chamar(env, 'GET', caminho);
    assert.equal(r.status, 200, caminho);
    assert.match(r.texto, /<title>Plannex \| Início<\/title>/, caminho);
  }
});

test('/privacidade e /termos entregam a página de Privacidade e Termos', async () => {
  const { env } = await criarAmbiente();
  for (const caminho of ['/privacidade', '/termos']) {
    const r = await chamar(env, 'GET', caminho);
    assert.equal(r.status, 200, caminho);
    assert.match(r.texto, /Privacidade e Termos/, caminho);
  }
});

test('caminho que não existe mostra a página 404 com status 404', async () => {
  const { env } = await criarAmbiente();
  const r = await chamar(env, 'GET', '/nao-existe');
  assert.equal(r.status, 404);
  assert.match(r.texto, /Página não encontrada/);
});

test('na demonstração confirmada, os caminhos do site levam à Central', async () => {
  const amb = await criarAmbiente({ DEMO: 'true', AMBIENTE: 'demo' });
  amb.banco.prepare("INSERT INTO ambiente (chave, valor) VALUES ('ambiente', 'demo')").run();
  await amb.ARQUIVOS.put('ambiente', 'demo');
  const r = await chamar(amb.env, 'GET', '/contato');
  assert.equal(r.status, 302);
  assert.match(r.headers.get('Location'), /\/painel\/$/);
});
