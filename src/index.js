// Worker da Plannex: serve o site (pasta public/) e a API da Central (painel interno).
// Tudo que não começa com /api/ vai direto para os arquivos estáticos.
//
// Acessos: "admin" vê e faz tudo. "funcionario" vê só os contatos em que é responsável,
// sem valores, nota fiscal, pagamento, notas nem ordens (mostram quanto a casa cobra).
// Ele vê e envia os documentos do cliente e os arquivos da entrega.
// Ele só anota e move as etapas de trabalho: Processo iniciado, Revisado pelo cliente e Entregue.

import { gerarHashSenha, conferirSenha, HASH_FALSO, base64 } from './senha.js';
import { PERFIS_DEMO, resetarDemo } from './demo.js';

// Chaves mantidas do banco; os nomes mudaram na versão resumida das etapas.
const ETAPAS = ['pedido', 'nota_emitida', 'processo_iniciado', 'revisado', 'entregue'];
const SERVICOS = ['calculos', 'automacao'];
const ORIGENS = ['site', 'whatsapp', 'indicacao', 'telefone', 'email', 'outro'];
const PAPEIS = ['admin', 'funcionario'];
// Cores que as etiquetas pessoais podem ter (as mesmas oferecidas na tela).
const CORES_ETIQUETA = ['laranja', 'azul', 'verde', 'roxo', 'rosa', 'amarelo', 'cinza'];
const CATEGORIAS_ARQUIVO = {
  cliente: 'documentos do cliente', nota: 'a nota fiscal', ordem: 'a ordem de serviço', outro: 'o arquivo', entrega: 'o arquivo da entrega',
};
// O funcionário vê e envia só os documentos do cliente e os arquivos da entrega.
const CATEGORIAS_FUNCIONARIO = ['cliente', 'entrega'];
// Abas da ficha: cada uma tem os seus comentários. "entrada" junta Caixa de entrada e Pedido.
const ABAS = ['entrada', 'nota_emitida', 'processo_iniciado', 'revisado', 'entregue'];
// Documentos enviados pelo site: tipos aceitos, tamanho total e o teto do armazenamento grátis (1 GB no KV).
const TIPOS_CLIENTE = /\.(pdf|jpe?g|png|webp|xlsx?|xlsm|csv|docx?|txt)$/i;
const CLIENTE_TOTAL_MAXIMO = 10 * 1024 * 1024;
const ARMAZENAMENTO_MAXIMO = 800 * 1024 * 1024;
// Etapas em que o funcionário trabalha. Pedido e Notas e ordens são do administrador.
const ETAPAS_FUNCIONARIO = ['processo_iniciado', 'revisado', 'entregue'];
const ARQUIVO_MAXIMO = 10 * 1024 * 1024;

// Tamanho máximo de cada campo do contato (os mesmos limites do formulário do site).
const CAMPOS_CONTATO = {
  nome: 120, telefone: 20, email: 180, plano: 80, descricao: 1800, atividade_manual: 900,
  manter_inalterado: 900, envio_documentos: 40, observacoes: 1200, chamada: 120,
};
// Campos que o funcionário não recebe.
const CAMPOS_FINANCEIROS = ['valor_centavos', 'nota_fiscal', 'pago_em'];

const COOKIE_SESSAO = 'plannex_sessao';
const SESSAO_SEGUNDOS = 7 * 24 * 60 * 60;

// Limites contra abuso: [quantidade, janela em minutos]
const LIMITE_CONTATO = [5, 10];
const LIMITE_LOGIN = [5, 15];

const AGORA_SQL = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

// Demonstração: só no Worker "plannex-demo", que tem DEMO=true. Sem a variável, nada disso existe.
const emDemo = env => env.DEMO === 'true';
const DEMO_ARQUIVO_MAXIMO = 1024 * 1024;
// Moldes em branco (só administrador): a ordem de serviço e o relatório. Aceitam PDF ou Word.
const MOLDES = { ordem: 'o molde da ordem de serviço', relatorio: 'o molde do relatório' };
const EXTENSOES_MOLDE = /\.(pdf|docx?)$/i;
const DEMO_LIMITE_ENVIOS = [40, 24 * 60];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Na demonstração o site público leva direto à Central: o formulário de lá mandaria e-mail de verdade.
    if (emDemo(env) && ['/', '/index.html'].includes(url.pathname)) return Response.redirect(new URL('/painel/', url), 302);
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
    // A demonstração volta aos dados de exemplo toda madrugada.
    if (emDemo(env)) await resetarDemo(env);
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM sessoes WHERE expira_em < ${AGORA_SQL}`),
      env.DB.prepare(`DELETE FROM tentativas WHERE quando < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day')`),
    ]);
  },
};

const negado = () => json({ erro: 'Seu acesso não permite isso.' }, 403);
const eAdmin = usuario => usuario.papel === 'admin';

async function api(request, env, url) {
  const { pathname } = url;
  const metodo = request.method;

  // Toda escrita precisa vir do próprio site.
  if (metodo !== 'GET' && request.headers.get('Origin') !== url.origin) {
    return json({ erro: 'Origem não permitida.' }, 403);
  }

  if (pathname === '/api/contato' && metodo === 'POST') return registrarContato(request, env);
  if (pathname.startsWith('/api/demo/')) return emDemo(env) ? demo(request, env, pathname) : json({ erro: 'Rota não encontrada.' }, 404);
  if (pathname === '/api/login' && metodo === 'POST') {
    return emDemo(env) ? json({ erro: 'Na demonstração não há senha: escolha um perfil.' }, 403) : login(request, env);
  }
  if (pathname === '/api/sair' && metodo === 'POST') return sair(request, env);

  const usuario = await usuarioDaSessao(request, env);
  if (!usuario) return json({ erro: 'Sessão expirada. Entre novamente.' }, 401);
  const admin = eAdmin(usuario);

  if (pathname === '/api/sessao' && metodo === 'GET') return json({ usuario, demo: emDemo(env) });
  if (pathname === '/api/central' && metodo === 'GET') return central(env, usuario);
  if (pathname === '/api/atividade' && metodo === 'GET') return atividade(env, usuario, new URL(request.url).searchParams);
  if (pathname === '/api/senha' && metodo === 'POST') return trocarSenha(request, env, usuario);
  if (pathname === '/api/eu' && metodo === 'PATCH') return salvarPreferencias(request, env, usuario);
  if (pathname === '/api/contatos' && metodo === 'POST') return admin ? cadastrarContato(request, env, usuario) : negado();
  if (pathname === '/api/usuarios' && metodo === 'POST') return admin ? criarUsuario(request, env, usuario) : negado();

  let rota = pathname.match(/^\/api\/contatos\/(\d+)(\/linha-do-tempo|\/notas|\/arquivos|\/etiquetas)?$/);
  if (rota) {
    const id = Number(rota[1]);
    // Funcionário só chega aos contatos em que é responsável.
    const contato = await contatoVisivel(env, usuario, id);
    if (!contato) return json({ erro: 'Contato não encontrado.' }, 404);
    if (!rota[2] && metodo === 'PATCH') return alterarContato(request, env, usuario, contato);
    if (!rota[2] && metodo === 'DELETE') return admin ? excluirContato(env, id) : negado();
    if (rota[2] === '/linha-do-tempo' && metodo === 'GET') return linhaDoTempo(env, usuario, id);
    if (rota[2] === '/notas' && metodo === 'POST') return !admin && contato.etapa === 'entregue' ? concluida() : anotar(request, env, usuario, id);
    if (rota[2] === '/arquivos' && metodo === 'GET') return listarArquivos(env, usuario, id);
    if (rota[2] === '/arquivos' && metodo === 'POST') return enviarArquivo(request, env, usuario, contato);
    if (rota[2] === '/etiquetas' && metodo === 'POST') return criarEtiqueta(request, env, usuario, id);
  }

  rota = pathname.match(/^\/api\/arquivos\/(\d+)$/);
  if (rota && metodo === 'GET') return baixarArquivo(env, usuario, Number(rota[1]));
  if (rota && metodo === 'DELETE') return excluirArquivo(env, usuario, Number(rota[1]));

  rota = pathname.match(/^\/api\/moldes\/(ordem|relatorio)$/);
  if (rota) {
    if (!admin) return negado();
    if (metodo === 'GET') return baixarMolde(env, rota[1]);
    if (metodo === 'POST') return enviarMolde(request, env, usuario, rota[1]);
    if (metodo === 'DELETE') return excluirMolde(env, rota[1]);
  }

  rota = pathname.match(/^\/api\/etiquetas\/(\d+)$/);
  if (rota && metodo === 'DELETE') return excluirEtiqueta(env, usuario, Number(rota[1]));

  rota = pathname.match(/^\/api\/notas\/(\d+)$/);
  if (rota && metodo === 'DELETE') return excluirNota(env, usuario, Number(rota[1]));

  rota = pathname.match(/^\/api\/usuarios\/(\d+)(\/senha)?$/);
  if (rota) {
    if (!admin) return negado();
    const id = Number(rota[1]);
    if (!rota[2] && metodo === 'DELETE') return removerUsuario(env, usuario, id);
    if (!rota[2] && metodo === 'PATCH') return alterarUsuario(request, env, usuario, id);
    if (rota[2] && metodo === 'POST') return redefinirSenha(request, env, usuario, id);
  }

  return json({ erro: 'Rota não encontrada.' }, 404);
}

async function contatoVisivel(env, usuario, id) {
  const contato = await env.DB.prepare('SELECT * FROM contatos WHERE id = ?').bind(id).first();
  if (!contato) return null;
  if (eAdmin(usuario)) return contato;
  return contato.responsavel_id === usuario.id && !contato.arquivado_em ? contato : null;
}

// ---------- Formulário do site ----------

async function registrarContato(request, env) {
  // Com documentos, o site manda multipart; sem, manda JSON.
  const multipart = (request.headers.get('Content-Type') || '').startsWith('multipart/form-data');
  let dados;
  let arquivos = [];
  if (multipart) {
    if (Number(request.headers.get('Content-Length') || 0) > CLIENTE_TOTAL_MAXIMO + 256 * 1024) return json({ erro: 'Arquivos grandes demais.' }, 413);
    const formulario = await request.formData().catch(() => null);
    if (!formulario) return json({ erro: 'Dados inválidos.' }, 400);
    dados = {};
    for (const [chave, valor] of formulario.entries()) {
      if (typeof valor === 'string') dados[chave] = valor;
      else if (chave === 'arquivos') arquivos.push(valor);
    }
  } else {
    dados = await lerJson(request);
  }
  // Campo invisível: só robô preenche. Responde ok para não dar pista.
  if (!dados || dados._honey) return json({ ok: true });

  const servico = String(dados.servico || '');
  const campos = camposDoContato(dados);
  if (!SERVICOS.includes(servico) || !campos.nome || campos.nome.length < 2) return json({ erro: 'Dados inválidos.' }, 400);

  const chave = `contato:${await hashIp(request)}`;
  if (await excedeuLimite(env, chave, LIMITE_CONTATO)) return json({ erro: 'Muitos envios. Tente mais tarde.' }, 429);

  // Quem reenvia depois de uma falha não gera um contato repetido.
  const repetido = await env.DB.prepare(
    "SELECT id FROM contatos WHERE servico = ? AND nome = ? AND criado_em > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-10 minutes')"
  ).bind(servico, campos.nome).first();
  await env.DB.prepare('INSERT INTO tentativas (chave) VALUES (?)').bind(chave).run();
  if (repetido) return json({ ok: true }, 201);

  const novo = await inserirContato(env, { ...campos, servico, origem: 'site' }, true).first();

  // Documentos que a pessoa anexou: mesmas regras do formulário (até 10 arquivos, 10 MB no total),
  // só tipos de documento e só enquanto houver espaço no armazenamento grátis.
  arquivos = arquivos.filter(a => a.size > 0 && TIPOS_CLIENTE.test(a.name || '')).slice(0, 10);
  const total = arquivos.reduce((soma, a) => soma + a.size, 0);
  if (arquivos.length && total <= CLIENTE_TOTAL_MAXIMO) {
    const { usado } = await env.DB.prepare('SELECT COALESCE(SUM(tamanho), 0) AS usado FROM arquivos').first();
    if (usado + total <= ARMAZENAMENTO_MAXIMO) {
      await guardarArquivos(env, novo.id, null, 'cliente', arquivos);
    } else {
      await nota(env, novo.id, null, 'enviou documentos pelo site, mas o armazenamento da Central está cheio: eles estão só no e-mail', 'sistema', false, 'entrada').run();
    }
  }
  return json({ ok: true }, 201);
}

function camposDoContato(dados) {
  const campos = {};
  for (const [campo, maximo] of Object.entries(CAMPOS_CONTATO)) {
    const longo = maximo > 200;
    const valor = longo ? limparTextoLongo(dados[campo], maximo) : limparTexto(dados[campo], maximo);
    campos[campo] = valor || null;
  }
  if (campos.email) campos.email = campos.email.toLowerCase();
  return campos;
}

function inserirContato(env, campos, devolverId = false) {
  const colunas = Object.keys(campos);
  return env.DB.prepare(`INSERT INTO contatos (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})${devolverId ? ' RETURNING id' : ''}`)
    .bind(...colunas.map(c => campos[c]));
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

  return json({ ok: true }, 200, { 'Set-Cookie': await criarSessao(env, registro.id) });
}

async function criarSessao(env, usuarioId) {
  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const expira = new Date(Date.now() + SESSAO_SEGUNDOS * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
  await env.DB.prepare('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)')
    .bind(await sha256(token), usuarioId, expira).run();
  return `${COOKIE_SESSAO}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSAO_SEGUNDOS}`;
}

// ---------- Demonstração ----------

async function demo(request, env, pathname) {
  const metodo = request.method;
  // Perfis para escolher. Na primeira visita (banco vazio), monta os dados de exemplo.
  if (pathname === '/api/demo/perfis' && metodo === 'GET') {
    const existe = await env.DB.prepare('SELECT COUNT(*) AS total FROM usuarios').first();
    if (!existe.total) await resetarDemo(env);
    return json({ perfis: PERFIS_DEMO.map(({ usuario, nome, papel, dica }) => ({ usuario, nome, papel, dica })) });
  }
  if (pathname === '/api/demo/entrar' && metodo === 'POST') {
    const dados = await lerJson(request);
    const perfil = PERFIS_DEMO.find(p => p.usuario === dados?.usuario);
    if (!perfil) return json({ erro: 'Perfil não encontrado.' }, 400);
    const registro = await env.DB.prepare('SELECT id FROM usuarios WHERE id = ? AND usuario = ?').bind(perfil.id, perfil.usuario).first();
    if (!registro) await resetarDemo(env);
    return json({ ok: true }, 200, { 'Set-Cookie': await criarSessao(env, perfil.id) });
  }
  if (pathname === '/api/demo/reiniciar' && metodo === 'POST') {
    const usuario = await usuarioDaSessao(request, env);
    if (!usuario) return json({ erro: 'Escolha um perfil primeiro.' }, 401);
    // Limitado: as cotas grátis do banco e dos arquivos são da conta toda, inclusive da Central real.
    if (await excedeuLimite(env, 'demo-reiniciar', [1, 10])) return json({ erro: 'A demonstração foi reiniciada há pouco. Tente de novo em alguns minutos.' }, 429);
    if (await excedeuLimite(env, 'demo-reiniciar-dia', [20, 24 * 60])) return json({ erro: 'A demonstração já foi reiniciada muitas vezes hoje. Ela volta ao exemplo sozinha de madrugada.' }, 429);
    await resetarDemo(env);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO tentativas (chave) VALUES (?)').bind('demo-reiniciar'),
      env.DB.prepare('INSERT INTO tentativas (chave) VALUES (?)').bind('demo-reiniciar-dia'),
    ]);
    return json({ ok: true });
  }
  return json({ erro: 'Rota não encontrada.' }, 404);
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
    `SELECT u.id, u.usuario, u.nome, u.papel, u.apelido, u.tema, u.area FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = ? AND s.expira_em > ${AGORA_SQL}`
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

// ---------- Equipe (só administrador) ----------

async function criarUsuario(request, env, autor) {
  const dados = await lerJson(request);
  const login = limparTexto(dados?.usuario, 60).toLowerCase();
  const nome = limparTexto(dados?.nome, 80);
  const senha = String(dados?.senha || '');
  const papel = PAPEIS.includes(dados?.papel) ? dados.papel : 'funcionario';
  const area = limparTexto(dados?.area, 30) || null;
  if (!/^[a-z0-9._-]{3,60}$/.test(login)) return json({ erro: 'O usuário aceita letras, números, ponto, hífen e sublinhado (3 a 60).' }, 400);
  if (nome.length < 2) return json({ erro: 'Informe o nome.' }, 400);
  if (senha.length < 10) return json({ erro: 'A senha precisa ter pelo menos 10 caracteres.' }, 400);

  const existe = await env.DB.prepare('SELECT id FROM usuarios WHERE usuario = ?').bind(login).first();
  if (existe) return json({ erro: 'Já existe alguém com esse usuário.' }, 409);

  await env.DB.prepare('INSERT INTO usuarios (usuario, nome, senha_hash, papel, area) VALUES (?, ?, ?, ?, ?)')
    .bind(login, nome, await gerarHashSenha(senha), papel, area).run();
  console.log(`usuário ${login} (${papel}) criado por ${autor.usuario}`);
  return json({ ok: true }, 201);
}

async function alterarUsuario(request, env, autor, id) {
  const dados = await lerJson(request);
  if (!dados) return json({ erro: 'Dados inválidos.' }, 400);
  const alvo = await env.DB.prepare('SELECT id FROM usuarios WHERE id = ?').bind(id).first();
  if (!alvo) return json({ erro: 'Usuário não encontrado.' }, 404);
  const escritas = [];
  if ('papel' in dados) {
    if (id === autor.id) return json({ erro: 'Você não pode mudar o seu próprio acesso.' }, 400);
    if (!PAPEIS.includes(dados.papel)) return json({ erro: 'Acesso inválido.' }, 400);
    escritas.push(env.DB.prepare('UPDATE usuarios SET papel = ? WHERE id = ?').bind(dados.papel, id));
  }
  // O nome completo só o administrador muda; a própria pessoa escolhe só o apelido.
  if ('nome' in dados) {
    const nome = limparTexto(dados.nome, 80);
    if (nome.length < 2) return json({ erro: 'Informe o nome completo.' }, 400);
    escritas.push(env.DB.prepare('UPDATE usuarios SET nome = ? WHERE id = ?').bind(nome, id));
  }
  // Usuário de login: o administrador pode trocar o de qualquer pessoa (a senha continua a mesma).
  if ('usuario' in dados) {
    if (emDemo(env)) return json({ erro: 'Na demonstração, o usuário de login dos perfis não muda.' }, 403);
    const login = limparTexto(dados.usuario, 60).toLowerCase();
    if (!/^[a-z0-9._-]{3,60}$/.test(login)) return json({ erro: 'O usuário aceita letras, números, ponto, hífen e sublinhado (3 a 60).' }, 400);
    const outro = await env.DB.prepare('SELECT id FROM usuarios WHERE usuario = ? AND id <> ?').bind(login, id).first();
    if (outro) return json({ erro: 'Já existe alguém com esse usuário.' }, 409);
    escritas.push(env.DB.prepare('UPDATE usuarios SET usuario = ? WHERE id = ?').bind(login, id));
  }
  // Equipe/área (T.I., economista, advogado...).
  if ('area' in dados) {
    escritas.push(env.DB.prepare('UPDATE usuarios SET area = ? WHERE id = ?').bind(limparTexto(dados.area, 30) || null, id));
  }
  if (!escritas.length) return json({ ok: true });
  await env.DB.batch(escritas);
  return json({ ok: true });
}

// Preferências da própria conta: apelido e tema.
async function salvarPreferencias(request, env, usuario) {
  const dados = await lerJson(request);
  if (!dados) return json({ erro: 'Dados inválidos.' }, 400);
  const escritas = [];
  if ('apelido' in dados) {
    const apelido = limparTexto(dados.apelido, 30) || null;
    escritas.push(env.DB.prepare('UPDATE usuarios SET apelido = ? WHERE id = ?').bind(apelido, usuario.id));
  }
  if ('tema' in dados) {
    if (!['escuro', 'claro'].includes(dados.tema)) return json({ erro: 'Tema inválido.' }, 400);
    escritas.push(env.DB.prepare('UPDATE usuarios SET tema = ? WHERE id = ?').bind(dados.tema, usuario.id));
  }
  if (escritas.length) await env.DB.batch(escritas);
  return json({ ok: true });
}

// ---------- Etiquetas pessoais ----------
// Cada pessoa cria as suas etiquetas nas demandas que vê; as dos outros não aparecem para ela.

async function criarEtiqueta(request, env, usuario, contatoId) {
  const dados = await lerJson(request);
  const texto = limparTexto(dados?.texto, 24);
  const cor = CORES_ETIQUETA.includes(dados?.cor) ? dados.cor : 'cinza';
  if (!texto) return json({ erro: 'Escreva a etiqueta.' }, 400);
  const { total } = await env.DB.prepare('SELECT COUNT(*) AS total FROM etiquetas WHERE contato_id = ? AND usuario_id = ?').bind(contatoId, usuario.id).first();
  if (total >= 6) return json({ erro: 'No máximo 6 etiquetas por demanda.' }, 400);
  const repetida = await env.DB.prepare('SELECT id FROM etiquetas WHERE contato_id = ? AND usuario_id = ? AND texto = ? COLLATE NOCASE').bind(contatoId, usuario.id, texto).first();
  if (repetida) return json({ ok: true });
  await env.DB.prepare('INSERT INTO etiquetas (contato_id, usuario_id, texto, cor) VALUES (?, ?, ?, ?)').bind(contatoId, usuario.id, texto, cor).run();
  return json({ ok: true }, 201);
}

async function excluirEtiqueta(env, usuario, id) {
  await env.DB.prepare('DELETE FROM etiquetas WHERE id = ? AND usuario_id = ?').bind(id, usuario.id).run();
  return json({ ok: true });
}

async function redefinirSenha(request, env, autor, id) {
  if (id === autor.id) return json({ erro: 'Para a sua própria senha, use Preferências.' }, 400);
  const dados = await lerJson(request);
  const senha = String(dados?.senha || '');
  if (senha.length < 10) return json({ erro: 'A senha precisa ter pelo menos 10 caracteres.' }, 400);
  const alvo = await env.DB.prepare('SELECT id FROM usuarios WHERE id = ?').bind(id).first();
  if (!alvo) return json({ erro: 'Usuário não encontrado.' }, 404);
  // A pessoa sai de todos os aparelhos e entra de novo com a senha nova.
  await env.DB.batch([
    env.DB.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').bind(await gerarHashSenha(senha), id),
    env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(id),
  ]);
  return json({ ok: true });
}

async function removerUsuario(env, autor, id) {
  if (id === autor.id) return json({ erro: 'Você não pode remover o seu próprio acesso.' }, 400);
  // O histórico continua, mostrando "usuário removido" no lugar do nome.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(id),
    env.DB.prepare('UPDATE contatos SET responsavel_id = NULL WHERE responsavel_id = ?').bind(id),
    env.DB.prepare('UPDATE contatos SET criado_por = NULL WHERE criado_por = ?').bind(id),
    env.DB.prepare('UPDATE movimentacoes SET usuario_id = NULL WHERE usuario_id = ?').bind(id),
    env.DB.prepare('UPDATE notas SET usuario_id = NULL WHERE usuario_id = ?').bind(id),
    env.DB.prepare('UPDATE arquivos SET usuario_id = NULL WHERE usuario_id = ?').bind(id),
    env.DB.prepare('DELETE FROM etiquetas WHERE usuario_id = ?').bind(id),
    env.DB.prepare('DELETE FROM usuarios WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}

// ---------- Central ----------

// Movimentações e anotações, das mais novas para as mais antigas. O funcionário vê só as das demandas dele
// (e nunca as anotações restritas). Parâmetros: [id do funcionário], limite, deslocamento.
function consultaAtividade(env, usuario, limite, deslocamento) {
  const admin = eAdmin(usuario);
  const filtro = admin ? '' : 'WHERE c.responsavel_id = ?1 AND c.arquivado_em IS NULL';
  const [pLimite, pDeslocamento] = admin ? ['?1', '?2'] : ['?2', '?3'];
  const consulta = env.DB.prepare(
    `SELECT * FROM (
       SELECT 'etapa' AS tipo, m.contato_id, c.nome AS contato, u.nome AS usuario, m.de, m.para, NULL AS texto, m.quando
       FROM movimentacoes m JOIN contatos c ON c.id = m.contato_id LEFT JOIN usuarios u ON u.id = m.usuario_id ${filtro}
       UNION ALL
       SELECT n.tipo, n.contato_id, c.nome, u.nome, NULL, NULL, n.texto, n.criado_em
       FROM notas n JOIN contatos c ON c.id = n.contato_id LEFT JOIN usuarios u ON u.id = n.usuario_id
       ${admin ? '' : `${filtro} AND n.restrito = 0`}
     ) ORDER BY quando DESC LIMIT ${pLimite} OFFSET ${pDeslocamento}`
  );
  return admin ? consulta.bind(limite, deslocamento) : consulta.bind(usuario.id, limite, deslocamento);
}

// "Ver mais" da atividade recente: as próximas, a partir de onde a tela parou.
async function atividade(env, usuario, parametros) {
  const deslocamento = Math.max(0, Math.min(100000, Number(parametros.get('a_partir')) || 0));
  const limite = 40;
  const { results } = await consultaAtividade(env, usuario, limite + 1, deslocamento).all();
  return json({ itens: results.slice(0, limite), temMais: results.length > limite });
}

// Tudo que a Central precisa numa chamada só. O funcionário recebe só o que é dele.
async function central(env, usuario) {
  const admin = eAdmin(usuario);
  const filtroContatos = admin ? '' : 'WHERE responsavel_id = ?1 AND arquivado_em IS NULL';
  const ligar = consulta => (admin ? consulta : consulta.bind(usuario.id));

  const [contatos, usuarios, recentes, etiquetas, moldes] = await env.DB.batch([
    ligar(env.DB.prepare(
      `SELECT id, servico, nome, telefone, email, plano, descricao, atividade_manual, manter_inalterado,
              envio_documentos, observacoes, chamada, origem, criado_por, criado_em, etapa, atualizado_em,
              lido_em, arquivado_em, valor_centavos, nota_fiscal, pago_em, prazo, responsavel_id,
              (SELECT COUNT(*) FROM notas n WHERE n.contato_id = contatos.id AND n.tipo = 'nota') AS total_notas,
              (SELECT COUNT(*) FROM arquivos a WHERE a.contato_id = contatos.id ${admin ? '' : "AND a.categoria IN ('cliente', 'entrega')"}) AS total_arquivos
       FROM contatos ${filtroContatos} ORDER BY criado_em DESC, id DESC LIMIT 5000`
    )),
    env.DB.prepare(`SELECT id, nome, apelido, papel, area${admin ? ', usuario, criado_em' : ''} FROM usuarios ORDER BY nome`),
    consultaAtividade(env, usuario, 30, 0),
    env.DB.prepare('SELECT id, contato_id, texto, cor FROM etiquetas WHERE usuario_id = ? ORDER BY id').bind(usuario.id),
    env.DB.prepare(admin
      ? 'SELECT m.tipo, m.nome, m.tamanho, m.atualizado_em, u.nome AS usuario FROM moldes m LEFT JOIN usuarios u ON u.id = m.usuario_id'
      : 'SELECT tipo FROM moldes WHERE 0'),
  ]);

  const lista = admin ? contatos.results : contatos.results.map(c => {
    const limpo = { ...c };
    for (const campo of CAMPOS_FINANCEIROS) limpo[campo] = null;
    return limpo;
  });
  return json({ usuario, contatos: lista, usuarios: usuarios.results, recentes: recentes.results, etiquetas: etiquetas.results, moldes: admin ? moldes.results : [], etapas: ETAPAS, demo: emDemo(env) });
}

async function cadastrarContato(request, env, usuario) {
  const dados = await lerJson(request);
  const servico = String(dados?.servico || '');
  const origem = ORIGENS.includes(dados?.origem) ? dados.origem : 'outro';
  const campos = camposDoContato(dados || {});
  if (!SERVICOS.includes(servico)) return json({ erro: 'Escolha Cálculos ou Automação.' }, 400);
  if (!campos.nome || campos.nome.length < 2) return json({ erro: 'Informe o nome do contato.' }, 400);

  // Cadastro manual já entra lido e, se pedido, direto em Pedido.
  const etapa = dados?.direto_para_pedido ? 'pedido' : null;
  const resultado = await env.DB.prepare(
    `INSERT INTO contatos (servico, nome, telefone, email, descricao, observacoes, origem, criado_por, lido_em, etapa, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${AGORA_SQL}, ?, ${etapa ? AGORA_SQL : 'NULL'}) RETURNING id`
  ).bind(servico, campos.nome, campos.telefone, campos.email, campos.descricao, campos.observacoes, origem, usuario.id, etapa).first();
  if (etapa) {
    await env.DB.prepare('INSERT INTO movimentacoes (contato_id, de, para, usuario_id) VALUES (?, NULL, ?, ?)')
      .bind(resultado.id, etapa, usuario.id).run();
  }
  return json({ ok: true, id: resultado.id }, 201);
}

async function alterarContato(request, env, usuario, contato) {
  const dados = await lerJson(request);
  if (!dados) return json({ erro: 'Dados inválidos.' }, 400);
  const id = contato.id;
  const admin = eAdmin(usuario);

  // Funcionário só move a etapa e marca como lido.
  if (!admin && Object.keys(dados).some(chave => !['etapa', 'lido'].includes(chave))) return negado();
  // Funcionário: de qualquer etapa, leva a demanda para Processo iniciado, Revisado pelo cliente e Entregue.
  // Voltar para Pedido/Notas e ordens ou reabrir uma concluída, só desfazendo o próprio movimento em até 10 minutos.
  if (!admin && 'etapa' in dados && (dados.etapa ?? null) !== contato.etapa) {
    const desfazendo = await podeDesfazer(env, usuario, contato, dados.etapa ?? null);
    if (contato.etapa === 'entregue' && !desfazendo) return concluida();
    if (!ETAPAS_FUNCIONARIO.includes(dados.etapa) && !desfazendo) {
      return json({ erro: 'Pedido e Notas e ordens são etapas do administrador.' }, 403);
    }
  }

  const sets = [];
  const valores = [];
  const registros = [];
  const definir = (coluna, valor) => { sets.push(`${coluna} = ?`); valores.push(valor); };
  const registrar = (texto, restrito = false) => registros.push(nota(env, id, usuario.id, texto, 'sistema', restrito));

  // Etapa: null devolve para a caixa de entrada.
  if ('etapa' in dados) {
    const etapa = dados.etapa ?? null;
    if (etapa !== null && !ETAPAS.includes(etapa)) return json({ erro: 'Etapa inválida.' }, 400);
    if (etapa !== contato.etapa) {
      definir('etapa', etapa);
      sets.push(`atualizado_em = ${AGORA_SQL}`);
      registros.push(env.DB.prepare('INSERT INTO movimentacoes (contato_id, de, para, usuario_id) VALUES (?, ?, ?, ?)')
        .bind(id, contato.etapa, etapa, usuario.id));
    }
  }

  if ('lido' in dados) definir('lido_em', dados.lido ? (contato.lido_em || new Date().toISOString().replace(/\.\d+Z$/, 'Z')) : null);

  if ('arquivado' in dados && Boolean(dados.arquivado) !== Boolean(contato.arquivado_em)) {
    if (dados.arquivado) sets.push(`arquivado_em = ${AGORA_SQL}`);
    else definir('arquivado_em', null);
    registrar(dados.arquivado ? 'arquivou o contato' : 'tirou o contato do arquivo');
  }

  if ('responsavel_id' in dados) {
    const responsavel = dados.responsavel_id === null ? null : Number(dados.responsavel_id);
    let nomeResponsavel = null;
    if (responsavel !== null) {
      const alvo = await env.DB.prepare('SELECT nome FROM usuarios WHERE id = ?').bind(responsavel).first();
      if (!alvo) return json({ erro: 'Responsável não encontrado.' }, 400);
      nomeResponsavel = alvo.nome;
    }
    if (responsavel !== contato.responsavel_id) {
      definir('responsavel_id', responsavel);
      registrar(nomeResponsavel ? `definiu ${nomeResponsavel} como responsável` : 'tirou o responsável');
    }
  }

  if ('valor_centavos' in dados) {
    const valor = dados.valor_centavos === null || dados.valor_centavos === '' ? null : Math.round(Number(dados.valor_centavos));
    if (valor !== null && (!Number.isFinite(valor) || valor < 0 || valor > 1e11)) return json({ erro: 'Valor inválido.' }, 400);
    if (valor !== contato.valor_centavos) {
      definir('valor_centavos', valor);
      registrar(valor === null ? 'apagou o valor' : `definiu o valor em ${reais(valor)}`, true);
    }
  }

  if ('nota_fiscal' in dados) {
    const nf = limparTexto(dados.nota_fiscal, 40) || null;
    if (nf !== contato.nota_fiscal) {
      definir('nota_fiscal', nf);
      registrar(nf ? `registrou a nota fiscal nº ${nf}` : 'apagou o número da nota fiscal', true);
    }
  }

  for (const [campo, rotulo, restrito] of [['pago_em', 'a data do pagamento', true], ['prazo', 'o prazo de entrega', false]]) {
    if (!(campo in dados)) continue;
    const valor = dados[campo] || null;
    if (valor !== null && !dataValida(valor)) return json({ erro: 'Data inválida. Use um ano entre 2000 e 2100.' }, 400);
    if (valor !== contato[campo]) {
      definir(campo, valor);
      registrar(valor ? `definiu ${rotulo} para ${dataBr(valor)}` : `apagou ${rotulo}`, restrito);
    }
  }

  // Dados do próprio contato (corrigir nome, telefone, e-mail, serviço ou descrição).
  if (dados.dados && typeof dados.dados === 'object') {
    const campos = camposDoContato({ ...contato, ...dados.dados });
    const alterados = [];
    for (const campo of ['nome', 'telefone', 'email', 'descricao', 'observacoes']) {
      if (campo in dados.dados && campos[campo] !== contato[campo]) {
        if (campo === 'nome' && (!campos.nome || campos.nome.length < 2)) return json({ erro: 'Informe o nome do contato.' }, 400);
        definir(campo, campos[campo]);
        alterados.push(campo === 'descricao' ? 'descrição' : campo === 'observacoes' ? 'observações' : campo);
      }
    }
    if ('servico' in dados.dados && SERVICOS.includes(dados.dados.servico) && dados.dados.servico !== contato.servico) {
      definir('servico', dados.dados.servico);
      alterados.push('serviço');
    }
    if (alterados.length) registrar(`editou ${juntar(alterados)} do contato`);
  }

  if (!sets.length) return json({ ok: true });
  await env.DB.batch([
    env.DB.prepare(`UPDATE contatos SET ${sets.join(', ')} WHERE id = ?`).bind(...valores, id),
    ...registros,
  ]);
  return json({ ok: true });
}

async function excluirContato(env, id) {
  const { results } = await env.DB.prepare('SELECT chave FROM arquivos WHERE contato_id = ?').bind(id).all();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM arquivos WHERE contato_id = ?').bind(id),
    env.DB.prepare('DELETE FROM etiquetas WHERE contato_id = ?').bind(id),
    env.DB.prepare('DELETE FROM notas WHERE contato_id = ?').bind(id),
    env.DB.prepare('DELETE FROM movimentacoes WHERE contato_id = ?').bind(id),
    env.DB.prepare('DELETE FROM contatos WHERE id = ?').bind(id),
  ]);
  await Promise.all(results.map(a => env.ARQUIVOS.delete(a.chave)));
  return json({ ok: true });
}

async function linhaDoTempo(env, usuario, id) {
  const restrito = eAdmin(usuario) ? '' : 'AND n.restrito = 0';
  const { results } = await env.DB.prepare(
    `SELECT * FROM (
       SELECT 'etapa' AS tipo, NULL AS nota_id, m.usuario_id, u.nome AS usuario, m.de, m.para, NULL AS texto, NULL AS aba, m.quando
       FROM movimentacoes m LEFT JOIN usuarios u ON u.id = m.usuario_id WHERE m.contato_id = ?1
       UNION ALL
       SELECT n.tipo, n.id, n.usuario_id, u.nome, NULL, NULL, n.texto, n.etapa, n.criado_em
       FROM notas n LEFT JOIN usuarios u ON u.id = n.usuario_id WHERE n.contato_id = ?1 ${restrito}
     ) ORDER BY quando, nota_id`
  ).bind(id).all();
  return json({ itens: results });
}

const concluida = () => json({ erro: 'Esta demanda já foi concluída. Para reabrir, fale com um administrador.' }, 403);

// Desfazer: a última movimentação foi desta pessoa, há menos de 10 minutos, e o destino é de onde a demanda saiu.
async function podeDesfazer(env, usuario, contato, alvo) {
  const ultima = await env.DB.prepare(
    "SELECT de, para, usuario_id, quando > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-10 minutes') AS recente FROM movimentacoes WHERE contato_id = ? ORDER BY quando DESC, id DESC LIMIT 1"
  ).bind(contato.id).first();
  return Boolean(ultima && ultima.recente && ultima.usuario_id === usuario.id
    && (ultima.para ?? null) === contato.etapa && (ultima.de ?? null) === alvo);
}

async function anotar(request, env, usuario, id) {
  const dados = await lerJson(request);
  const texto = limparTextoLongo(dados?.texto, 2000);
  if (!texto) return json({ erro: 'Escreva a anotação.' }, 400);
  const aba = ABAS.includes(dados?.aba) ? dados.aba : 'entrada';
  if (aba === 'nota_emitida' && !eAdmin(usuario)) return negado();
  await nota(env, id, usuario.id, texto, 'nota', aba === 'nota_emitida', aba).run();
  return json({ ok: true }, 201);
}

async function excluirNota(env, usuario, id) {
  const registro = await env.DB.prepare('SELECT usuario_id, tipo FROM notas WHERE id = ?').bind(id).first();
  if (!registro) return json({ erro: 'Anotação não encontrada.' }, 404);
  if (registro.tipo !== 'nota' || registro.usuario_id !== usuario.id) return json({ erro: 'Só dá para apagar as suas anotações.' }, 403);
  await env.DB.prepare('DELETE FROM notas WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

function nota(env, contatoId, usuarioId, texto, tipo = 'sistema', restrito = false, aba = null) {
  return env.DB.prepare('INSERT INTO notas (contato_id, usuario_id, tipo, texto, restrito, etapa) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(contatoId, usuarioId, tipo, texto, restrito ? 1 : 0, aba);
}

// ---------- Arquivos ----------
// O conteúdo vai para o KV; o banco guarda nome, tipo, tamanho e quem enviou.
// Notas fiscais, ordens de serviço e "outros" são do administrador (mostram quanto a casa cobra).
// Documentos do cliente e arquivos da entrega são do trabalho: o funcionário vê e envia.

const podeVerCategoria = (usuario, categoria) => eAdmin(usuario) || CATEGORIAS_FUNCIONARIO.includes(categoria);
// Aba da ficha em que cada tipo de arquivo aparece.
const ABA_DA_CATEGORIA = { cliente: 'entrada', nota: 'nota_emitida', ordem: 'nota_emitida', outro: 'nota_emitida', entrega: 'entregue' };

async function listarArquivos(env, usuario, contatoId) {
  const filtro = eAdmin(usuario) ? '' : `AND a.categoria IN (${CATEGORIAS_FUNCIONARIO.map(c => `'${c}'`).join(', ')})`;
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.categoria, a.nome, a.tipo, a.tamanho, a.usuario_id, a.criado_em, u.nome AS usuario
     FROM arquivos a LEFT JOIN usuarios u ON u.id = a.usuario_id
     WHERE a.contato_id = ? ${filtro} ORDER BY a.criado_em DESC, a.id DESC`
  ).bind(contatoId).all();
  return json({ arquivos: results });
}

async function enviarArquivo(request, env, usuario, contato) {
  if (Number(request.headers.get('Content-Length') || 0) > ARQUIVO_MAXIMO + 64 * 1024) {
    return json({ erro: 'O arquivo passa de 10 MB.' }, 413);
  }
  const formulario = await request.formData().catch(() => null);
  const arquivo = formulario?.get('arquivo');
  const categoria = String(formulario?.get('categoria') || 'outro');
  if (!arquivo || typeof arquivo === 'string') return json({ erro: 'Escolha um arquivo.' }, 400);
  if (!(categoria in CATEGORIAS_ARQUIVO)) return json({ erro: 'Tipo de arquivo inválido.' }, 400);
  if (!podeVerCategoria(usuario, categoria)) return negado();
  // Funcionário não mexe mais numa demanda concluída.
  if (!eAdmin(usuario) && contato.etapa === 'entregue') return concluida();
  if (arquivo.size > ARQUIVO_MAXIMO) return json({ erro: 'O arquivo passa de 10 MB.' }, 413);
  if (!arquivo.size) return json({ erro: 'O arquivo está vazio.' }, 400);
  if (emDemo(env)) {
    if (arquivo.size > DEMO_ARQUIVO_MAXIMO) return json({ erro: 'Na demonstração, o limite é 1 MB por arquivo.' }, 413);
    if (await excedeuLimite(env, 'demo-envio', DEMO_LIMITE_ENVIOS)) return json({ erro: 'A demonstração atingiu o limite de envios de hoje.' }, 429);
    await env.DB.prepare('INSERT INTO tentativas (chave) VALUES (?)').bind('demo-envio').run();
  }
  await guardarArquivos(env, contato.id, usuario.id, categoria, [arquivo]);
  return json({ ok: true }, 201);
}

// Grava no KV e registra no banco; se o banco falhar, apaga do KV para não sobrar lixo.
async function guardarArquivos(env, contatoId, usuarioId, categoria, arquivos) {
  const registros = [];
  for (const arquivo of arquivos) {
    const nome = limparTexto(arquivo.name, 160).replace(/[\\/:*?"<>|]/g, '_') || 'arquivo';
    const tipo = limparTexto(arquivo.type, 100) || 'application/octet-stream';
    const chave = `contato/${contatoId}/${crypto.randomUUID()}`;
    await env.ARQUIVOS.put(chave, await arquivo.arrayBuffer());
    registros.push({ nome, tipo, chave, tamanho: arquivo.size });
  }
  const restrito = !CATEGORIAS_FUNCIONARIO.includes(categoria);
  const texto = registros.length === 1
    ? `anexou ${CATEGORIAS_ARQUIVO[categoria]} "${registros[0].nome}"`
    : `anexou ${registros.length} arquivos (${CATEGORIAS_ARQUIVO[categoria]})`;
  try {
    await env.DB.batch([
      ...registros.map(r => env.DB.prepare('INSERT INTO arquivos (contato_id, categoria, nome, tipo, tamanho, chave, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(contatoId, categoria, r.nome, r.tipo, r.tamanho, r.chave, usuarioId)),
      nota(env, contatoId, usuarioId, texto, 'sistema', restrito, ABA_DA_CATEGORIA[categoria]),
    ]);
  } catch (erro) {
    await Promise.all(registros.map(r => env.ARQUIVOS.delete(r.chave)));
    throw erro;
  }
}

async function arquivoVisivel(env, usuario, id) {
  const arquivo = await env.DB.prepare('SELECT * FROM arquivos WHERE id = ?').bind(id).first();
  if (!arquivo || !podeVerCategoria(usuario, arquivo.categoria)) return null;
  return (await contatoVisivel(env, usuario, arquivo.contato_id)) ? arquivo : null;
}

async function baixarArquivo(env, usuario, id) {
  const arquivo = await arquivoVisivel(env, usuario, id);
  if (!arquivo) return json({ erro: 'Arquivo não encontrado.' }, 404);
  const conteudo = await env.ARQUIVOS.get(arquivo.chave, { type: 'stream' });
  if (!conteudo) return json({ erro: 'O conteúdo do arquivo não foi encontrado.' }, 404);
  // Sempre como download: nada enviado por usuário é aberto como página do site.
  return new Response(conteudo, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${arquivo.nome.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(arquivo.nome)}`,
      'Content-Length': String(arquivo.tamanho),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

// ---------- Moldes em branco ----------

async function baixarMolde(env, tipo) {
  const molde = await env.DB.prepare('SELECT nome, tamanho, chave FROM moldes WHERE tipo = ?').bind(tipo).first();
  if (!molde) return json({ erro: 'Ainda não há molde enviado.' }, 404);
  const conteudo = await env.ARQUIVOS.get(molde.chave, { type: 'stream' });
  if (!conteudo) return json({ erro: 'O conteúdo do molde não foi encontrado.' }, 404);
  return new Response(conteudo, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${molde.nome.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(molde.nome)}`,
      'Content-Length': String(molde.tamanho),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

// Enviar um molde substitui o anterior do mesmo tipo.
async function enviarMolde(request, env, usuario, tipo) {
  if (Number(request.headers.get('Content-Length') || 0) > ARQUIVO_MAXIMO + 64 * 1024) {
    return json({ erro: 'O arquivo passa de 10 MB.' }, 413);
  }
  const formulario = await request.formData().catch(() => null);
  const arquivo = formulario?.get('arquivo');
  if (!arquivo || typeof arquivo === 'string') return json({ erro: 'Escolha um arquivo.' }, 400);
  if (!EXTENSOES_MOLDE.test(arquivo.name || '')) return json({ erro: 'O molde precisa ser PDF ou Word (.pdf, .doc ou .docx).' }, 400);
  if (arquivo.size > ARQUIVO_MAXIMO) return json({ erro: 'O arquivo passa de 10 MB.' }, 413);
  if (!arquivo.size) return json({ erro: 'O arquivo está vazio.' }, 400);
  if (emDemo(env)) {
    if (arquivo.size > DEMO_ARQUIVO_MAXIMO) return json({ erro: 'Na demonstração, o limite é 1 MB por arquivo.' }, 413);
    if (await excedeuLimite(env, 'demo-envio', DEMO_LIMITE_ENVIOS)) return json({ erro: 'A demonstração atingiu o limite de envios de hoje.' }, 429);
    await env.DB.prepare('INSERT INTO tentativas (chave) VALUES (?)').bind('demo-envio').run();
  }
  const nome = limparTexto(arquivo.name, 160).replace(/[\\/:*?"<>|]/g, '_') || 'molde';
  const chave = `moldes/${tipo}/${crypto.randomUUID()}`;
  const anterior = await env.DB.prepare('SELECT chave FROM moldes WHERE tipo = ?').bind(tipo).first();
  await env.ARQUIVOS.put(chave, await arquivo.arrayBuffer());
  try {
    await env.DB.prepare(`INSERT INTO moldes (tipo, nome, tamanho, chave, usuario_id) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (tipo) DO UPDATE SET nome = excluded.nome, tamanho = excluded.tamanho, chave = excluded.chave,
        usuario_id = excluded.usuario_id, atualizado_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`)
      .bind(tipo, nome, arquivo.size, chave, usuario.id).run();
  } catch (erro) {
    await env.ARQUIVOS.delete(chave);
    throw erro;
  }
  if (anterior) await env.ARQUIVOS.delete(anterior.chave);
  return json({ ok: true }, 201);
}

async function excluirMolde(env, tipo) {
  const molde = await env.DB.prepare('SELECT chave FROM moldes WHERE tipo = ?').bind(tipo).first();
  if (!molde) return json({ ok: true });
  await env.DB.prepare('DELETE FROM moldes WHERE tipo = ?').bind(tipo).run();
  await env.ARQUIVOS.delete(molde.chave);
  return json({ ok: true });
}

async function excluirArquivo(env, usuario, id) {
  const arquivo = await arquivoVisivel(env, usuario, id);
  if (!arquivo) return json({ erro: 'Arquivo não encontrado.' }, 404);
  if (!eAdmin(usuario)) {
    // Funcionário só apaga o que ele mesmo enviou, e não depois de concluída.
    if (arquivo.usuario_id !== usuario.id) return negado();
    const contato = await env.DB.prepare('SELECT etapa FROM contatos WHERE id = ?').bind(arquivo.contato_id).first();
    if (contato?.etapa === 'entregue') return concluida();
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM arquivos WHERE id = ?').bind(id),
    nota(env, arquivo.contato_id, usuario.id, `removeu ${CATEGORIAS_ARQUIVO[arquivo.categoria]} "${arquivo.nome}"`, 'sistema',
      !CATEGORIAS_FUNCIONARIO.includes(arquivo.categoria), ABA_DA_CATEGORIA[arquivo.categoria]),
  ]);
  await env.ARQUIVOS.delete(arquivo.chave);
  return json({ ok: true });
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

// Só datas completas e plausíveis (o campo de data do navegador manda "0002-10-03" enquanto se digita o ano).
function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(Date.parse(`${texto}T00:00:00Z`))) return false;
  const ano = Number(texto.slice(0, 4));
  return ano >= 2000 && ano <= 2100;
}

function dataBr(texto) {
  const [ano, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${ano}`;
}

function reais(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function juntar(itens) {
  return itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : itens[0];
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
  if (Number(request.headers.get('Content-Length') || 0) > 32000) return null;
  return request.json().catch(() => null);
}

function limparTexto(valor, maximo) {
  return String(valor ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximo);
}

// Para textos com parágrafos: mantém as quebras de linha, tira o resto dos caracteres de controle.
function limparTextoLongo(valor, maximo) {
  return String(valor ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, maximo);
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
