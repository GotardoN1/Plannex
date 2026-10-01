// Worker da Plannex: serve o site (pasta public/) e a API do painel interno.
// Tudo que não começa com /api/ vai direto para os arquivos estáticos.

import { gerarHashSenha, conferirSenha, HASH_FALSO, base64 } from './senha.js';

const ETAPAS = ['pedido', 'nota_emitida', 'pagamento_efetuado', 'processo_iniciado', 'revisado', 'concluido', 'entregue'];
const SERVICOS = ['calculos', 'automacao'];

const COOKIE_SESSAO = 'plannex_sessao';
const SESSAO_SEGUNDOS = 7 * 24 * 60 * 60;

// Limites contra abuso: [quantidade, janela em minutos]
const LIMITE_CONTATO = [5, 10];
const LIMITE_LOGIN = [5, 15];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await api(request, env, url);
    } catch (erro) {
      console.error(erro);
      return json({ erro: 'Erro interno. Tente novamente.' }, 500);
    }
  },

  // Limpeza diária: sessões vencidas e registros antigos de tentativas.
  async scheduled(_evento, env) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessoes WHERE expira_em < strftime('%Y-%m-%dT%H:%M:%SZ', 'now')"),
      env.DB.prepare("DELETE FROM tentativas WHERE quando < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day')"),
    ]);
  },
};

async function api(request, env, url) {
  const { pathname } = url;
  const metodo = request.method;

  // Toda escrita precisa vir do próprio site.
  if (metodo !== 'GET' && request.headers.get('Origin') !== url.origin) {
    return json({ erro: 'Origem não permitida.' }, 403);
  }

  if (pathname === '/api/contato' && metodo === 'POST') return registrarContato(request, env);
  if (pathname === '/api/login' && metodo === 'POST') return login(request, env);
  if (pathname === '/api/sair' && metodo === 'POST') return sair(request, env);

  const usuario = await usuarioDaSessao(request, env);
  if (!usuario) return json({ erro: 'Sessão expirada. Entre novamente.' }, 401);

  if (pathname === '/api/sessao' && metodo === 'GET') return json({ usuario });
  if (pathname === '/api/senha' && metodo === 'POST') return trocarSenha(request, env, usuario);
  if (pathname === '/api/contatos' && metodo === 'GET') return listarContatos(env);

  const rota = pathname.match(/^\/api\/contatos\/(\d+)(\/movimentacoes)?$/);
  if (rota) {
    const id = Number(rota[1]);
    if (rota[2] && metodo === 'GET') return listarMovimentacoes(env, id);
    if (!rota[2] && metodo === 'PATCH') return moverContato(request, env, usuario, id);
    if (!rota[2] && metodo === 'DELETE') return excluirContato(env, id);
  }

  return json({ erro: 'Rota não encontrada.' }, 404);
}

// ---------- Formulário do site ----------

async function registrarContato(request, env) {
  const dados = await lerJson(request);
  // Campo invisível: só robô preenche. Responde ok para não dar pista.
  if (!dados || dados._honey) return json({ ok: true });

  const servico = String(dados.servico || '');
  const nome = limparTexto(dados.nome, 120);
  if (!SERVICOS.includes(servico) || nome.length < 2) return json({ erro: 'Dados inválidos.' }, 400);

  const chave = `contato:${await hashIp(request)}`;
  if (await excedeuLimite(env, chave, LIMITE_CONTATO)) return json({ erro: 'Muitos envios. Tente mais tarde.' }, 429);

  // Quem reenvia depois de uma falha não gera um contato repetido.
  const repetido = await env.DB.prepare(
    "SELECT id FROM contatos WHERE servico = ? AND nome = ? AND criado_em > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-10 minutes')"
  ).bind(servico, nome).first();

  const escritas = [env.DB.prepare('INSERT INTO tentativas (chave) VALUES (?)').bind(chave)];
  if (!repetido) escritas.push(env.DB.prepare('INSERT INTO contatos (servico, nome) VALUES (?, ?)').bind(servico, nome));
  await env.DB.batch(escritas);
  return json({ ok: true }, 201);
}

// ---------- Login e sessão ----------

async function login(request, env) {
  const dados = await lerJson(request);
  const usuario = limparTexto(dados?.usuario, 60).toLowerCase();
  const senha = String(dados?.senha || '');
  if (!usuario || !senha) return json({ erro: 'Informe usuário e senha.' }, 400);

  const chaveIp = `login-ip:${await hashIp(request)}`;
  const chaveUsuario = `login-usuario:${usuario}`;
  if (await excedeuLimite(env, chaveIp, LIMITE_LOGIN) || await excedeuLimite(env, chaveUsuario, LIMITE_LOGIN)) {
    return json({ erro: 'Muitas tentativas. Aguarde 15 minutos.' }, 429);
  }

  const registro = await env.DB.prepare('SELECT id, senha_hash FROM usuarios WHERE usuario = ?').bind(usuario).first();
  // Sem usuário, confere mesmo assim contra um hash qualquer para o tempo de resposta não denunciar quem existe.
  const confere = await conferirSenha(senha, registro?.senha_hash || HASH_FALSO);
  if (!registro || !confere) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO tentativas (chave) VALUES (?)').bind(chaveIp),
      env.DB.prepare('INSERT INTO tentativas (chave) VALUES (?)').bind(chaveUsuario),
    ]);
    return json({ erro: 'Usuário ou senha incorretos.' }, 401);
  }

  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const expira = new Date(Date.now() + SESSAO_SEGUNDOS * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
  await env.DB.prepare('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)')
    .bind(await sha256(token), registro.id, expira).run();

  return json({ ok: true }, 200, {
    'Set-Cookie': `${COOKIE_SESSAO}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSAO_SEGUNDOS}`,
  });
}

async function sair(request, env) {
  const token = lerCookie(request, COOKIE_SESSAO);
  if (token) await env.DB.prepare('DELETE FROM sessoes WHERE token_hash = ?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, {
    'Set-Cookie': `${COOKIE_SESSAO}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
  });
}

async function usuarioDaSessao(request, env) {
  const token = lerCookie(request, COOKIE_SESSAO);
  if (!token) return null;
  return env.DB.prepare(
    `SELECT u.id, u.usuario, u.nome FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = ? AND s.expira_em > strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`
  ).bind(await sha256(token)).first();
}

async function trocarSenha(request, env, usuario) {
  const dados = await lerJson(request);
  const atual = String(dados?.atual || '');
  const nova = String(dados?.nova || '');
  if (nova.length < 10) return json({ erro: 'A nova senha precisa ter pelo menos 10 caracteres.' }, 400);

  const registro = await env.DB.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').bind(usuario.id).first();
  if (!(await conferirSenha(atual, registro.senha_hash))) return json({ erro: 'A senha atual está incorreta.' }, 400);

  // Trocar a senha encerra as outras sessões; a atual continua.
  const tokenAtual = await sha256(lerCookie(request, COOKIE_SESSAO));
  await env.DB.batch([
    env.DB.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').bind(await gerarHashSenha(nova), usuario.id),
    env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ? AND token_hash <> ?').bind(usuario.id, tokenAtual),
  ]);
  return json({ ok: true });
}

// ---------- Contatos ----------

async function listarContatos(env) {
  const { results } = await env.DB.prepare(
    'SELECT id, servico, nome, criado_em, etapa, atualizado_em FROM contatos ORDER BY criado_em DESC, id DESC LIMIT 5000'
  ).all();
  return json({ contatos: results, etapas: ETAPAS });
}

async function moverContato(request, env, usuario, id) {
  const dados = await lerJson(request);
  // null devolve o contato para a caixa de entrada.
  const etapa = dados?.etapa ?? null;
  if (etapa !== null && !ETAPAS.includes(etapa)) return json({ erro: 'Etapa inválida.' }, 400);

  const contato = await env.DB.prepare('SELECT etapa FROM contatos WHERE id = ?').bind(id).first();
  if (!contato) return json({ erro: 'Contato não encontrado.' }, 404);
  if (contato.etapa === etapa) return json({ ok: true });

  await env.DB.batch([
    env.DB.prepare("UPDATE contatos SET etapa = ?, atualizado_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?").bind(etapa, id),
    env.DB.prepare('INSERT INTO movimentacoes (contato_id, de, para, usuario_id) VALUES (?, ?, ?, ?)').bind(id, contato.etapa, etapa, usuario.id),
  ]);
  return json({ ok: true });
}

async function excluirContato(env, id) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM movimentacoes WHERE contato_id = ?').bind(id),
    env.DB.prepare('DELETE FROM contatos WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}

async function listarMovimentacoes(env, id) {
  const { results } = await env.DB.prepare(
    `SELECT m.de, m.para, m.quando, u.nome AS usuario FROM movimentacoes m
     LEFT JOIN usuarios u ON u.id = m.usuario_id WHERE m.contato_id = ? ORDER BY m.quando, m.id`
  ).bind(id).all();
  return json({ movimentacoes: results });
}

// ---------- Utilitários ----------

async function excedeuLimite(env, chave, [maximo, minutos]) {
  const linha = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM tentativas WHERE chave = ? AND quando > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)"
  ).bind(chave, `-${minutos} minutes`).first();
  return linha.total >= maximo;
}

// O IP não é guardado: só um hash dele, para contar tentativas.
async function hashIp(request) {
  return (await sha256(request.headers.get('CF-Connecting-IP') || 'local')).slice(0, 32);
}

async function sha256(texto) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64url(bytes) {
  return base64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function lerCookie(request, nome) {
  const cookies = request.headers.get('Cookie') || '';
  for (const parte of cookies.split(';')) {
    const [chave, ...valor] = parte.trim().split('=');
    if (chave === nome) return valor.join('=');
  }
  return '';
}

async function lerJson(request) {
  if (Number(request.headers.get('Content-Length') || 0) > 10000) return null;
  return request.json().catch(() => null);
}

function limparTexto(valor, maximo) {
  return String(valor || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximo);
}

function json(corpo, status = 200, extras = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extras,
    },
  });
}
