-- Acessos (administrador e funcionário), etapas resumidas e arquivos (notas e ordens de serviço).

-- Quem já existia continua administrador.
ALTER TABLE usuarios ADD COLUMN papel TEXT NOT NULL DEFAULT 'admin' CHECK (papel IN ('admin', 'funcionario'));

-- Etapas resumidas: Pedido > Notas e ordens > Processo iniciado > Revisado pelo cliente > Entregue.
-- As chaves antigas que saem viram a etapa equivalente; o histórico de movimentações fica como estava.
UPDATE contatos SET etapa = 'nota_emitida' WHERE etapa = 'pagamento_efetuado';
UPDATE contatos SET etapa = 'revisado' WHERE etapa = 'concluido';

-- Registros de valor, nota fiscal e pagamento são controle interno: funcionário não vê.
ALTER TABLE notas ADD COLUMN restrito INTEGER NOT NULL DEFAULT 0;
UPDATE notas SET restrito = 1
WHERE tipo = 'sistema' AND (texto LIKE '%valor%' OR texto LIKE '%nota fiscal%' OR texto LIKE '%pagamento%');

-- Arquivos anexados ao contato. O conteúdo fica no KV (chave), aqui só os dados.
CREATE TABLE arquivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contato_id INTEGER NOT NULL REFERENCES contatos (id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN ('nota', 'ordem', 'outro')),
  nome TEXT NOT NULL,
  tipo TEXT,
  tamanho INTEGER NOT NULL,
  chave TEXT NOT NULL UNIQUE,
  usuario_id INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX arquivos_contato ON arquivos (contato_id, criado_em);
