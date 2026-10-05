// Apoio dos testes: um ambiente completo em memória (D1 pelo node:sqlite, KV num Map), com dados fictícios,
// e um cliente HTTP que chama o Worker direto (sem rede). Rodar: npm test
import worker from '../src/index.js';
import { gerarHashSenha } from '../src/senha.js';
import { criarD1, criarKv, ASSETS } from '../tools/ambiente-local.mjs';
import { criarZip } from '../public/painel/js/zip.js';

export const ORIGEM = 'https://plannex.teste';
export const SENHA = 'senha-de-teste-123';

// Equipe fictícia: 1 administrador e 2 funcionários.
export const EQUIPE = {
  ana: { id: 1, nome: 'Ana Admin', papel: 'admin' },
  bia: { id: 2, nome: 'Bia Funcionária', papel: 'funcionario', area: 'Economista' },
  caio: { id: 3, nome: 'Caio Funcionário', papel: 'funcionario', area: 'T.I.' },
};

// Monta o ambiente. "extras" entra no env (ex.: { DEMO: 'true', AMBIENTE: 'demo' }).
export async function criarAmbiente(extras = {}, { semDados = false } = {}) {
  const { DB, banco } = criarD1(':memory:');
  const ARQUIVOS = criarKv();
  const env = { DB, ARQUIVOS, ASSETS, AMBIENTE: 'producao', ...extras };
  if (!semDados) {
    const hash = await gerarHashSenha(SENHA);
    for (const [usuario, u] of Object.entries(EQUIPE)) {
      banco.prepare('INSERT INTO usuarios (id, usuario, nome, senha_hash, papel, area) VALUES (?, ?, ?, ?, ?, ?)').run(u.id, usuario, u.nome, hash, u.papel, u.area || null);
    }
    // Demandas fictícias: 10 da Bia (em Pedido), 20 do Caio (em Pedido), 30 na caixa de entrada.
    const contato = (id, responsavel, etapa, servico = 'calculos') => banco.prepare(
      `INSERT INTO contatos (id, servico, nome, telefone, email, descricao, origem, etapa, responsavel_id, protocolo)
       VALUES (?, ?, ?, '(11) 90000-0000', 'cliente${id}@exemplo.com', 'Descrição fictícia', 'site', ?, ?, ?)`
    ).run(id, servico, `Cliente ${id}`, etapa, responsavel, `PLX-2026-${String(id).padStart(4, '0')}`);
    contato(10, 2, 'pedido');
    contato(11, 2, 'pedido', 'automacao');
    contato(20, 3, 'pedido');
    contato(30, null, null);
  }
  return { env, banco, ARQUIVOS };
}

// Chamada ao Worker. Escritas levam a Origem do site (como o navegador).
export async function chamar(env, metodo, caminho, { cookie, corpo, form, origem = ORIGEM } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (metodo !== 'GET' && origem) headers.Origin = origem;
  let body;
  if (form) body = form;
  else if (corpo !== undefined && metodo !== 'GET') { body = JSON.stringify(corpo); headers['Content-Type'] = 'application/json'; }
  const resposta = await worker.fetch(new Request(`${ORIGEM}${caminho}`, { method: metodo, headers, body }), env);
  const texto = await resposta.clone().text();
  let dados = null;
  try { dados = JSON.parse(texto); } catch { /* não é JSON */ }
  return { status: resposta.status, dados, texto, headers: resposta.headers, resposta };
}

// Entra com usuário e senha e devolve o cookie de sessão.
export async function entrar(env, usuario) {
  const r = await chamar(env, 'POST', '/api/login', { corpo: { usuario, senha: SENHA } });
  if (r.status !== 200) throw new Error(`login de ${usuario} falhou: ${r.status} ${r.texto}`);
  return r.headers.get('Set-Cookie').split(';')[0];
}

// ---------- Arquivos fictícios ----------
const texto = s => new TextEncoder().encode(s);
const zipBytes = async entradas => new Uint8Array(await criarZip(entradas.map(([nome, conteudo]) => ({ nome, bytes: texto(conteudo) })), { pastas: true }).arrayBuffer());

export const AMOSTRAS = {
  pdf: () => texto('%PDF-1.4\n% documento fictício\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'),
  png: () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]),
  jpg: () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0]),
  csv: () => texto('competencia;valor\njan/2026;100,00\n'),
  csvComNulo: () => new Uint8Array([0x61, 0x3b, 0x62, 0x00, 0x0a]),
  executavel: () => new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0, 0, 0]),
  html: () => texto('<!doctype html><script>alert(1)</script>'),
  xml: () => texto('<?xml version="1.0"?><nfeProc><NFe/></nfeProc>'),
  xlsx: () => zipBytes([['[Content_Types].xml', '<Types/>'], ['xl/workbook.xml', '<workbook/>']]),
  xlsxComMacro: () => zipBytes([['[Content_Types].xml', '<Types/>'], ['xl/workbook.xml', '<workbook/>'], ['xl/vbaProject.bin', 'macro']]),
  docx: () => zipBytes([['[Content_Types].xml', '<Types/>'], ['word/document.xml', '<document/>']]),
};

export function formulario(nome, bytes, campos = {}) {
  const form = new FormData();
  form.append('arquivo', new File([bytes], nome));
  for (const [k, v] of Object.entries(campos)) form.append(k, v);
  return form;
}
