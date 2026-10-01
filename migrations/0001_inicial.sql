-- Caixa de entrada: cada envio do formulário do site vira um contato.
-- Guarda só o necessário para o histórico; o pedido completo continua indo por e-mail.
CREATE TABLE contatos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  servico TEXT NOT NULL CHECK (servico IN ('calculos', 'automacao')),
  nome TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  -- NULL enquanto está só na caixa de entrada; depois, a etapa do andamento.
  etapa TEXT CHECK (etapa IN ('pedido', 'nota_emitida', 'pagamento_efetuado', 'processo_iniciado', 'revisado', 'concluido', 'entregue')),
  atualizado_em TEXT
);
CREATE INDEX contatos_criado_em ON contatos (criado_em DESC);
CREATE INDEX contatos_etapa ON contatos (etapa);

CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nome TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Quem moveu o quê, e quando.
CREATE TABLE movimentacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contato_id INTEGER NOT NULL REFERENCES contatos (id) ON DELETE CASCADE,
  de TEXT,
  para TEXT,
  usuario_id INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
  quando TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX movimentacoes_contato ON movimentacoes (contato_id, quando);

-- O cookie leva o token; aqui fica só o hash dele.
CREATE TABLE sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  expira_em TEXT NOT NULL
);

-- Limite de tentativas de login e de envios do formulário.
CREATE TABLE tentativas (
  chave TEXT NOT NULL,
  quando TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX tentativas_chave ON tentativas (chave, quando);
