-- Preferências de cada pessoa (apelido e tema) e etiquetas pessoais nas demandas.

-- Apelido que aparece na conta; o nome completo continua sendo definido pelo administrador.
ALTER TABLE usuarios ADD COLUMN apelido TEXT;
-- Tema da Central: 'escuro' (padrão) ou 'claro'.
ALTER TABLE usuarios ADD COLUMN tema TEXT NOT NULL DEFAULT 'escuro' CHECK (tema IN ('escuro', 'claro'));

-- Etiquetas que cada pessoa coloca nas demandas para se organizar. Cada um vê só as suas.
CREATE TABLE etiquetas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contato_id INTEGER NOT NULL REFERENCES contatos (id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  cor TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX etiquetas_usuario ON etiquetas (usuario_id, contato_id);
