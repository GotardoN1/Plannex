// Financeiro, versão dos dados (atualização sem F5), requisitos da entrega e guia de uso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAmbiente, chamar, entrar, AMOSTRAS, formulario } from './apoio.mjs';

test('Financeiro e Empresa: só administrador', async () => {
  const { env } = await criarAmbiente();
  const bia = await entrar(env, 'bia');
  for (const [m, c, corpo] of [['GET', '/api/financeiro'], ['PATCH', '/api/empresa', { pct_casa: 10 }], ['POST', '/api/despesas', { nome: 'x' }]]) {
    assert.equal((await chamar(env, m, c, { cookie: bia, corpo })).status, 403, `${m} ${c}`);
  }
  const ana = await entrar(env, 'ana');
  const r = await chamar(env, 'GET', '/api/financeiro', { cookie: ana });
  assert.equal(r.status, 200);
  assert.equal(r.dados.empresa.socio1, 'Gustavo Ricardo');
  assert.equal(r.dados.empresa.socio2, 'Robson Barros');
  assert.equal(r.dados.empresa.pct_casa, 30);
});

test('Empresa: salva dados, confere CNPJ e percentuais', async () => {
  const { env } = await criarAmbiente();
  const ana = await entrar(env, 'ana');
  assert.equal((await chamar(env, 'PATCH', '/api/empresa', { cookie: ana, corpo: { cnpj: '123' } })).status, 400);
  assert.equal((await chamar(env, 'PATCH', '/api/empresa', { cookie: ana, corpo: { pct_casa: 120 } })).status, 400);
  assert.equal((await chamar(env, 'PATCH', '/api/empresa', { cookie: ana, corpo: { nome_fantasia: 'Plannex', razao_social: 'Plannex Ltda.', cnpj: '12345678000190', pct_casa: 25, pct_equipe: 60 } })).status, 200);
  assert.equal((await chamar(env, 'PATCH', '/api/empresa', { cookie: ana, corpo: { pct_equipe: -1 } })).status, 400);
  const r = await chamar(env, 'GET', '/api/financeiro', { cookie: ana });
  assert.equal(r.dados.empresa.cnpj, '12.345.678/0001-90');
  assert.equal(r.dados.empresa.pct_casa, 25);
  assert.equal(r.dados.empresa.pct_equipe, 60);
});

test('Despesas: registrar já paga, renovar (vencimento anda um ciclo), editar e excluir', async () => {
  const { env, banco } = await criarAmbiente();
  const ana = await entrar(env, 'ana');
  const nova = await chamar(env, 'POST', '/api/despesas', { cookie: ana, corpo: { nome: 'Domínio', valor_centavos: 4990, inicio: '2026-01-10', vencimento: '2029-01-10', recorrencia: 'personalizada', meses: 36, ja_paga: true } });
  assert.equal(nova.status, 201);
  const id = nova.dados.id;
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM despesas_pagamentos WHERE despesa_id = ?').get(id).n, 1);
  const anual = await chamar(env, 'POST', '/api/despesas', { cookie: ana, corpo: { nome: 'CORECON', valor_centavos: 62000, inicio: '2026-01-05', vencimento: '2027-01-05', recorrencia: 'anual' } });
  const renovada = await chamar(env, 'POST', `/api/despesas/${anual.dados.id}/renovar`, { cookie: ana, corpo: { pago_em: '2027-01-04', valor_centavos: 65000 } });
  assert.equal(renovada.status, 200);
  assert.equal(renovada.dados.vencimento, '2028-01-05');
  assert.equal((await chamar(env, 'POST', '/api/despesas', { cookie: ana, corpo: { nome: '' } })).status, 400);
  assert.equal((await chamar(env, 'POST', '/api/despesas', { cookie: ana, corpo: { nome: 'X', recorrencia: 'personalizada' } })).status, 400);
  assert.equal((await chamar(env, 'PATCH', `/api/despesas/${id}`, { cookie: ana, corpo: { nome: 'Domínio plannex', encerrada: true } })).status, 200);
  assert.ok(banco.prepare('SELECT encerrada_em FROM despesas WHERE id = ?').get(id).encerrada_em);
  assert.equal((await chamar(env, 'DELETE', `/api/despesas/${id}`, { cookie: ana })).status, 200);
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM despesas_pagamentos WHERE despesa_id = ?').get(id).n, 0);
});

test('versão dos dados sobe a cada escrita e não sobe em leitura', async () => {
  const { env } = await criarAmbiente();
  const ana = await entrar(env, 'ana');
  const v0 = (await chamar(env, 'GET', '/api/versao', { cookie: ana })).dados.versao;
  await chamar(env, 'GET', '/api/central', { cookie: ana });
  assert.equal((await chamar(env, 'GET', '/api/versao', { cookie: ana })).dados.versao, v0);
  await chamar(env, 'PATCH', '/api/contatos/30', { cookie: ana, corpo: { lido: true } });
  assert.equal((await chamar(env, 'GET', '/api/versao', { cookie: ana })).dados.versao, v0 + 1);
  // Escrita recusada não sobe.
  await chamar(env, 'PATCH', '/api/contatos/999', { cookie: ana, corpo: { lido: true } });
  assert.equal((await chamar(env, 'GET', '/api/versao', { cookie: ana })).dados.versao, v0 + 1);
  assert.equal((await chamar(env, 'GET', '/api/versao')).status, 401);
});

test('entrega de cálculo exige relatório (PDF/Word) e planilha; automação, a planilha', async () => {
  const { env, banco } = await criarAmbiente();
  banco.prepare("UPDATE contatos SET iniciado_em = '2026-10-01T00:00:00Z' WHERE id IN (10, 11)").run();
  const bia = await entrar(env, 'bia');
  const pdf = new Uint8Array(2048); pdf.set(AMOSTRAS.pdf());
  const enviar = (id, nome, bytes) => chamar(env, 'POST', `/api/contatos/${id}/arquivos`, { cookie: bia, form: formulario(nome, bytes, { categoria: 'entrega' }) });
  // Cálculo (10): só o PDF não basta.
  assert.equal((await enviar(10, 'parecer.pdf', pdf)).status, 201);
  const semPlanilha = await chamar(env, 'PATCH', '/api/contatos/10', { cookie: bia, corpo: { etapa: 'entregue' } });
  assert.equal(semPlanilha.status, 400);
  assert.match(semPlanilha.dados.erro, /planilha de cálculos/);
  // Planilha (CSV) com mais de 1 KB.
  assert.equal((await enviar(10, 'calculos.csv', new TextEncoder().encode('a;b\n'.repeat(400)))).status, 201);
  assert.equal((await chamar(env, 'PATCH', '/api/contatos/10', { cookie: bia, corpo: { etapa: 'entregue' } })).status, 200);
  // Automação (11): sem planilha, recusa; com planilha, entrega.
  assert.equal((await enviar(11, 'guia.pdf', pdf)).status, 201);
  const auto = await chamar(env, 'PATCH', '/api/contatos/11', { cookie: bia, corpo: { etapa: 'entregue' } });
  assert.equal(auto.status, 400);
  assert.match(auto.dados.erro, /a planilha/);
  assert.equal((await enviar(11, 'controle.csv', new TextEncoder().encode('x;y\n'.repeat(400)))).status, 201);
  assert.equal((await chamar(env, 'PATCH', '/api/contatos/11', { cookie: bia, corpo: { etapa: 'entregue' } })).status, 200);
});

test('guia de uso: administrador envia, funcionário baixa; a ordem de serviço continua só do administrador', async () => {
  const { env } = await criarAmbiente();
  const ana = await entrar(env, 'ana');
  assert.equal((await chamar(env, 'POST', '/api/moldes/guia', { cookie: ana, form: formulario('guia.pdf', AMOSTRAS.pdf()) })).status, 201);
  const bia = await entrar(env, 'bia');
  assert.equal((await chamar(env, 'GET', '/api/moldes/guia', { cookie: bia })).status, 200);
  assert.equal((await chamar(env, 'GET', '/api/moldes/ordem', { cookie: bia })).status, 403);
  assert.equal((await chamar(env, 'POST', '/api/moldes/guia', { cookie: bia, form: formulario('guia.pdf', AMOSTRAS.pdf()) })).status, 403);
});
