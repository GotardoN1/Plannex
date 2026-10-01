-- Ficha em abas: cada etapa tem os seus comentários, e duas categorias novas de arquivo:
-- "cliente" (documentos que a pessoa enviou) e "entrega" (Excel e relatório finais).

-- Aba de cada anotação: entrada, nota_emitida, processo_iniciado, revisado ou entregue.
ALTER TABLE notas ADD COLUMN etapa TEXT;
-- As anotações que já existiam ficam na aba Caixa de entrada.
UPDATE notas SET etapa = 'entrada' WHERE tipo = 'nota';

-- O CHECK das categorias não pode ser alterado: a tabela é recriada com os mesmos dados.
-- Nenhuma outra tabela aponta para "arquivos", então trocar a tabela não afeta o resto.
CREATE TABLE arquivos_novo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contato_id INTEGER NOT NULL REFERENCES contatos (id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN ('cliente', 'nota', 'ordem', 'outro', 'entrega')),
  nome TEXT NOT NULL,
  tipo TEXT,
  tamanho INTEGER NOT NULL,
  chave TEXT NOT NULL UNIQUE,
  usuario_id INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
INSERT INTO arquivos_novo (id, contato_id, categoria, nome, tipo, tamanho, chave, usuario_id, criado_em)
  SELECT id, contato_id, categoria, nome, tipo, tamanho, chave, usuario_id, criado_em FROM arquivos;
DROP TABLE arquivos;
ALTER TABLE arquivos_novo RENAME TO arquivos;
CREATE INDEX arquivos_contato ON arquivos (contato_id, criado_em);
