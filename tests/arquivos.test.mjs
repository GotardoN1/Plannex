// 4. Uploads: lista permitida por fluxo, conteúdo real conferido, macros tratadas à parte; downloads protegidos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAmbiente, chamar, entrar, AMOSTRAS, formulario } from './apoio.mjs';

const enviar = async (env, cookie, contato, nome, bytes, categoria = 'cliente') =>
  chamar(env, 'POST', `/api/contatos/${contato}/arquivos`, { cookie, form: formulario(nome, bytes, { categoria }) });

test('aceita formatos da lista com conteúdo que confere (e guarda o tipo real)', async () => {
  const { env, banco } = await criarAmbiente();
  const cookie = await entrar(env, 'bia');
  for (const [nome, bytes, categoria] of [
    ['peticao.pdf', AMOSTRAS.pdf(), 'cliente'],
    ['foto.png', AMOSTRAS.png(), 'cliente'],
    ['foto.jpg', AMOSTRAS.jpg(), 'cliente'],
    ['valores.csv', AMOSTRAS.csv(), 'cliente'],
    ['planilha.xlsx', await AMOSTRAS.xlsx(), 'cliente'],
    ['parecer.docx', await AMOSTRAS.docx(), 'entrega'],
  ]) {
    const r = await enviar(env, cookie, 10, nome, bytes, categoria);
    assert.equal(r.status, 201, `${nome}: ${r.texto}`);
  }
  const tipos = banco.prepare('SELECT nome, tipo FROM arquivos WHERE contato_id = 10 ORDER BY id').all();
  assert.equal(tipos.find(t => t.nome === 'peticao.pdf').tipo, 'application/pdf');
  assert.equal(tipos.find(t => t.nome === 'foto.png').tipo, 'image/png');
});

test('recusa extensões fora da lista (programas, páginas, compactados, scripts)', async () => {
  const { env, banco } = await criarAmbiente();
  const cookie = await entrar(env, 'bia');
  for (const nome of ['programa.exe', 'pagina.html', 'imagem.svg', 'pacote.zip', 'script.js', 'atalho.lnk', 'sem-extensao']) {
    const r = await enviar(env, cookie, 10, nome, AMOSTRAS.pdf());
    assert.equal(r.status, 400, nome);
  }
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM arquivos').get().n, 0);
});

test('recusa conteúdo que não confere com a extensão', async () => {
  const { env, banco } = await criarAmbiente();
  const cookie = await entrar(env, 'bia');
  for (const [nome, bytes] of [
    ['falso.pdf', AMOSTRAS.executavel()],
    ['falso.png', AMOSTRAS.jpg()],
    ['falso.jpg', AMOSTRAS.pdf()],
    ['falso.xlsx', AMOSTRAS.pdf()],
    ['falso.docx', await AMOSTRAS.xlsx()],
    ['binario.csv', AMOSTRAS.csvComNulo()],
    ['executavel.csv', AMOSTRAS.executavel()],
    ['pagina.txt', AMOSTRAS.html()],
  ]) {
    const r = await enviar(env, cookie, 10, nome, bytes);
    assert.equal(r.status, 400, `${nome}: ${r.texto}`);
    assert.match(r.dados.erro, /não corresponde/);
  }
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM arquivos').get().n, 0);
});

test('macros: .xlsx com macro escondida é recusado; .docm recusado; .xlsm só em automação, com aviso', async () => {
  const { env, banco } = await criarAmbiente();
  const cookie = await entrar(env, 'bia');
  assert.equal((await enviar(env, cookie, 10, 'planilha.xlsx', await AMOSTRAS.xlsxComMacro())).status, 400);
  const docm = await enviar(env, cookie, 10, 'documento.docm', await AMOSTRAS.docx());
  assert.equal(docm.status, 400);
  assert.match(docm.dados.erro, /macros/);
  // Demanda 10 é de cálculos: .xlsm do cliente é recusado.
  const calculos = await enviar(env, cookie, 10, 'planilha.xlsm', await AMOSTRAS.xlsxComMacro());
  assert.equal(calculos.status, 400);
  assert.match(calculos.dados.erro, /automação/);
  // Demanda 11 é de automação: aceito, marcado com aviso de macro.
  assert.equal((await enviar(env, cookie, 11, 'planilha.xlsm', await AMOSTRAS.xlsxComMacro())).status, 201);
  // Na entrega (planilha automatizada), também aceito com aviso.
  assert.equal((await enviar(env, cookie, 10, 'entrega.xlsm', await AMOSTRAS.xlsxComMacro(), 'entrega')).status, 201);
  const avisos = banco.prepare('SELECT nome, aviso FROM arquivos ORDER BY id').all();
  assert.deepEqual(avisos.map(a => a.aviso), ['macro', 'macro']);
  // A lista da ficha traz o aviso.
  const lista = await chamar(env, 'GET', '/api/contatos/11/arquivos', { cookie });
  assert.equal(lista.dados.arquivos[0].aviso, 'macro');
});

test('notas e ordens (administrador) aceitam o XML da nota fiscal; funcionário não envia nessa categoria', async () => {
  const { env } = await criarAmbiente();
  assert.equal((await enviar(env, await entrar(env, 'ana'), 10, 'nfe.xml', AMOSTRAS.xml(), 'nota')).status, 201);
  assert.equal((await enviar(env, await entrar(env, 'bia'), 10, 'nfe.xml', AMOSTRAS.xml(), 'nota')).status, 403);
});

test('limite de 10 MB continua valendo', async () => {
  const { env } = await criarAmbiente();
  const grande = new Uint8Array(10 * 1024 * 1024 + 10);
  grande.set(AMOSTRAS.pdf());
  const r = await enviar(env, await entrar(env, 'bia'), 10, 'grande.pdf', grande);
  assert.equal(r.status, 413);
});

test('formulário do site: arquivo que não confere fica de fora e a ficha registra a recusa', async () => {
  const { env, banco } = await criarAmbiente();
  const form = new FormData();
  for (const [k, v] of Object.entries({ servico: 'calculos', nome: 'Cliente Fictício', telefone: '11988887777', email: 'ficticio@exemplo.com', descricao: 'Atualização de cálculo trabalhista' })) form.append(k, v);
  form.append('arquivos', new File([AMOSTRAS.pdf()], 'sentenca.pdf'));
  form.append('arquivos', new File([AMOSTRAS.executavel()], 'holerite.pdf'));
  form.append('arquivos', new File([AMOSTRAS.pdf()], 'programa.exe'));
  const r = await chamar(env, 'POST', '/api/contato', { form });
  assert.equal(r.status, 201);
  const contato = banco.prepare("SELECT id FROM contatos WHERE nome = 'Cliente Fictício'").get();
  assert.deepEqual(banco.prepare('SELECT nome FROM arquivos WHERE contato_id = ?').all(contato.id).map(a => a.nome), ['sentenca.pdf']);
  const nota = banco.prepare("SELECT texto FROM notas WHERE contato_id = ? AND texto LIKE '%recusados%'").get(contato.id);
  assert.match(nota.texto, /holerite\.pdf/);
  assert.match(nota.texto, /programa\.exe/);
});

test('moldes conferem o conteúdo; materiais aceitam qualquer arquivo', async () => {
  const { env } = await criarAmbiente();
  const cookie = await entrar(env, 'ana');
  const moldeFalso = await chamar(env, 'POST', '/api/moldes/relatorio', { cookie, form: formulario('molde.pdf', AMOSTRAS.executavel()) });
  assert.equal(moldeFalso.status, 400);
  const molde = await chamar(env, 'POST', '/api/moldes/relatorio', { cookie, form: formulario('molde.pdf', AMOSTRAS.pdf()) });
  assert.equal(molde.status, 201);
  // Materiais aceitam qualquer tipo de arquivo (o download sai sempre como anexo).
  const materialQualquer = await chamar(env, 'POST', '/api/materiais', { cookie, form: formulario('indices.csv', AMOSTRAS.csvComNulo()) });
  assert.equal(materialQualquer.status, 201);
  const material = await chamar(env, 'POST', '/api/materiais', { cookie, form: formulario('indices.csv', AMOSTRAS.csv()) });
  assert.equal(material.status, 201);
});

test('download: só com login e acesso à demanda; sempre como anexo e com nosniff', async () => {
  const { env, banco } = await criarAmbiente();
  const bia = await entrar(env, 'bia');
  assert.equal((await enviar(env, bia, 10, 'peticao.pdf', AMOSTRAS.pdf())).status, 201);
  const id = banco.prepare("SELECT id FROM arquivos WHERE nome = 'peticao.pdf'").get().id;
  // Responsável e administrador baixam.
  for (const cookie of [bia, await entrar(env, 'ana')]) {
    const r = await chamar(env, 'GET', `/api/arquivos/${id}`, { cookie });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('Content-Disposition'), /^attachment;/);
    assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(r.headers.get('Content-Type'), 'application/octet-stream');
    assert.match(r.headers.get('Cache-Control'), /no-store/);
    assert.ok(r.texto.startsWith('%PDF-'));
  }
  // Outro funcionário e quem não entrou, não.
  assert.equal((await chamar(env, 'GET', `/api/arquivos/${id}`, { cookie: await entrar(env, 'caio') })).status, 404);
  assert.equal((await chamar(env, 'GET', `/api/arquivos/${id}`)).status, 401);
  // A chave no armazenamento é aleatória (não dá para adivinhar) e não existe rota pública para ela.
  const chave = banco.prepare('SELECT chave FROM arquivos WHERE id = ?').get(id).chave;
  assert.match(chave, /^contato\/10\/[0-9a-f-]{36}$/);
  assert.equal((await chamar(env, 'GET', `/${chave}`)).status, 404);
});
