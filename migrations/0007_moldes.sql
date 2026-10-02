-- Moldes em branco que a equipe baixa para preencher: a ordem de serviço (PDF) e o relatório (Word).
-- Um de cada; enviar outro substitui. O conteúdo fica no KV ARQUIVOS, com a chave guardada aqui.
CREATE TABLE moldes (
  tipo TEXT PRIMARY KEY CHECK (tipo IN ('ordem', 'relatorio')),
  nome TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  chave TEXT NOT NULL,
  usuario_id INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
