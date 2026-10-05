-- 2026-10-05
-- 1. Moldes: além da ordem de serviço e do relatório (cálculos), o guia de uso (automação).
CREATE TABLE moldes_novo (
  tipo TEXT PRIMARY KEY CHECK (tipo IN ('ordem', 'relatorio', 'guia')),
  nome TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  chave TEXT NOT NULL,
  usuario_id INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
INSERT INTO moldes_novo (tipo, nome, tamanho, chave, usuario_id, atualizado_em)
  SELECT tipo, nome, tamanho, chave, usuario_id, atualizado_em FROM moldes;
DROP TABLE moldes;
ALTER TABLE moldes_novo RENAME TO moldes;

-- 2. Versão dos dados: sobe a cada mudança. A Central consulta só este número (uma linha) a cada poucos
--    segundos e, quando muda, recarrega sozinha para todos (sem F5).
CREATE TABLE versao (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  n INTEGER NOT NULL DEFAULT 0
);
INSERT INTO versao (id, n) VALUES (1, 0);

-- 3. Empresa: dados cadastrais e a divisão do que entra (parte da casa e dos dois sócios).
CREATE TABLE empresa (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nome_fantasia TEXT,
  razao_social TEXT,
  cnpj TEXT,
  socio1 TEXT NOT NULL DEFAULT 'Gustavo Ricardo',
  socio2 TEXT NOT NULL DEFAULT 'Robson Barros',
  pct_casa REAL NOT NULL DEFAULT 30 CHECK (pct_casa >= 0 AND pct_casa <= 100),
  pct_socio1 REAL NOT NULL DEFAULT 50 CHECK (pct_socio1 >= 0 AND pct_socio1 <= 100),
  atualizado_em TEXT
);
INSERT INTO empresa (id, nome_fantasia) VALUES (1, 'Plannex');

-- 4. Despesas da empresa: o que foi comprado, quando e quando vence de novo (domínio, CORECON…).
--    recorrencia: 'unica' (não renova), 'mensal', 'anual' ou 'personalizada' (a cada "meses").
CREATE TABLE despesas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  categoria TEXT,
  valor_centavos INTEGER CHECK (valor_centavos IS NULL OR valor_centavos >= 0),
  inicio TEXT,
  vencimento TEXT,
  recorrencia TEXT NOT NULL DEFAULT 'unica' CHECK (recorrencia IN ('unica', 'mensal', 'anual', 'personalizada')),
  meses INTEGER CHECK (meses IS NULL OR meses > 0),
  observacao TEXT,
  encerrada_em TEXT,
  criado_por INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX despesas_vencimento ON despesas (vencimento);

-- Cada pagamento de uma despesa (a compra e as renovações), para o resultado de cada mês.
CREATE TABLE despesas_pagamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  despesa_id INTEGER NOT NULL REFERENCES despesas (id) ON DELETE CASCADE,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos >= 0),
  pago_em TEXT NOT NULL,
  usuario_id INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX despesas_pagamentos_data ON despesas_pagamentos (pago_em);
