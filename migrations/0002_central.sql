-- Central: ficha completa do contato, dados do negócio e anotações.

-- Dados que chegam pelo formulário do site (ou do cadastro manual).
ALTER TABLE contatos ADD COLUMN telefone TEXT;
ALTER TABLE contatos ADD COLUMN email TEXT;
ALTER TABLE contatos ADD COLUMN plano TEXT;
ALTER TABLE contatos ADD COLUMN descricao TEXT;
ALTER TABLE contatos ADD COLUMN atividade_manual TEXT;
ALTER TABLE contatos ADD COLUMN manter_inalterado TEXT;
ALTER TABLE contatos ADD COLUMN envio_documentos TEXT;
ALTER TABLE contatos ADD COLUMN observacoes TEXT;
-- Botão do site que levou ao formulário (ex.: "Cálculo simples").
ALTER TABLE contatos ADD COLUMN chamada TEXT;
-- site, whatsapp, indicacao, telefone, email, outro
ALTER TABLE contatos ADD COLUMN origem TEXT NOT NULL DEFAULT 'site';
ALTER TABLE contatos ADD COLUMN criado_por INTEGER REFERENCES usuarios (id) ON DELETE SET NULL;

-- Controle interno.
ALTER TABLE contatos ADD COLUMN lido_em TEXT;
ALTER TABLE contatos ADD COLUMN arquivado_em TEXT;
ALTER TABLE contatos ADD COLUMN valor_centavos INTEGER;
ALTER TABLE contatos ADD COLUMN nota_fiscal TEXT;
ALTER TABLE contatos ADD COLUMN pago_em TEXT;
ALTER TABLE contatos ADD COLUMN prazo TEXT;
ALTER TABLE contatos ADD COLUMN responsavel_id INTEGER REFERENCES usuarios (id) ON DELETE SET NULL;

-- Os contatos que já existiam contam como lidos.
UPDATE contatos SET lido_em = criado_em WHERE lido_em IS NULL;

-- Anotações da equipe e registros automáticos de alteração (tipo = 'sistema').
CREATE TABLE notas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contato_id INTEGER NOT NULL REFERENCES contatos (id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'nota' CHECK (tipo IN ('nota', 'sistema')),
  texto TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX notas_contato ON notas (contato_id, criado_em);
CREATE INDEX notas_recentes ON notas (criado_em DESC);
CREATE INDEX movimentacoes_recentes ON movimentacoes (quando DESC);
