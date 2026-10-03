-- Materiais da equipe: arquivos de uso frequente (moldes, planilhas de demonstração, PDFs).
-- Poucos arquivos; o conteúdo fica no KV ARQUIVOS, com a chave guardada aqui.
CREATE TABLE materiais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT,
  tamanho INTEGER NOT NULL,
  chave TEXT NOT NULL,
  usuario_id INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX materiais_atualizado ON materiais (atualizado_em DESC);
