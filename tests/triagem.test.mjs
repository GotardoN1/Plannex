// Triagem: alerta de classificação e correção sem apagar o texto do cliente; cadastro manual sem padrão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarClassificacao } from '../public/painel/js/classificacao.js';
import { criarAmbiente, chamar, entrar } from './apoio.mjs';

test('alerta quando a descrição ou o plano não combinam com o serviço marcado', () => {
  assert.equal(avaliarClassificacao({ servico: 'calculos', plano: 'Cálculo simples', descricao: 'Quero automatizar minha planilha de estoque no Excel com macros e botões' }).sugestao, 'automacao');
  assert.equal(avaliarClassificacao({ servico: 'automacao', plano: 'Cálculo simples', descricao: 'planilha' }).sugestao, 'calculos');
  assert.equal(avaliarClassificacao({ servico: 'automacao', plano: 'Automação Pontual', descricao: 'Cálculo da sentença trabalhista com juros e correção monetária do processo' }).sugestao, 'calculos');
});

test('sem alerta quando está coerente (inclusive "planilha" num pedido de cálculo)', () => {
  assert.equal(avaliarClassificacao({ servico: 'calculos', plano: 'Cálculo simples', descricao: 'Atualização monetária de uma sentença trabalhista com juros e FGTS' }).alerta, false);
  assert.equal(avaliarClassificacao({ servico: 'calculos', plano: 'Cálculo simples', descricao: 'Planilha de cálculo de horas extras do processo' }).alerta, false);
  assert.equal(avaliarClassificacao({ servico: 'automacao', plano: 'Pacote Evolução', descricao: 'Automatizar o controle de estoque da planilha' }).alerta, false);
});

test('corrigir a classificação muda serviço e plano, mantém o texto do cliente e registra no histórico', async () => {
  const { env, banco } = await criarAmbiente();
  banco.prepare("UPDATE contatos SET plano = 'Cálculo simples', descricao = 'Quero automatizar minha planilha' WHERE id = 30").run();
  const r = await chamar(env, 'PATCH', '/api/contatos/30', { cookie: await entrar(env, 'ana'), corpo: { dados: { servico: 'automacao', plano: 'Automação Pontual' } } });
  assert.equal(r.status, 200);
  const c = banco.prepare('SELECT servico, plano, descricao FROM contatos WHERE id = 30').get();
  assert.deepEqual({ ...c }, { servico: 'automacao', plano: 'Automação Pontual', descricao: 'Quero automatizar minha planilha' });
  const nota = banco.prepare("SELECT texto FROM notas WHERE contato_id = 30 AND texto LIKE 'corrigiu a classificação%'").get();
  assert.match(nota.texto, /Cálculos para Automação/);
  assert.match(nota.texto, /"Cálculo simples" para "Automação Pontual"/);
});

test('funcionário não reclassifica', async () => {
  const { env, banco } = await criarAmbiente();
  const r = await chamar(env, 'PATCH', '/api/contatos/10', { cookie: await entrar(env, 'bia'), corpo: { dados: { servico: 'automacao' } } });
  assert.equal(r.status, 403);
  assert.equal(banco.prepare('SELECT servico FROM contatos WHERE id = 10').get().servico, 'calculos');
});

test('cadastro manual sem serviço é recusado; sem "já aceito" fica na caixa de entrada', async () => {
  const { env, banco } = await criarAmbiente();
  const cookie = await entrar(env, 'ana');
  assert.equal((await chamar(env, 'POST', '/api/contatos', { cookie, corpo: { nome: 'Sem Serviço' } })).status, 400);
  const r = await chamar(env, 'POST', '/api/contatos', { cookie, corpo: { nome: 'Pela Caixa', servico: 'calculos', origem: 'whatsapp' } });
  assert.equal(r.status, 201);
  assert.equal(banco.prepare('SELECT etapa FROM contatos WHERE id = ?').get(r.dados.id).etapa, null);
});
