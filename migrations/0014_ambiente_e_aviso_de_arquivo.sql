-- Segurança (2026-10-04).
-- 1. Marca do ambiente: o modo demonstração só liga se o banco ligado ao Worker estiver marcado como
--    'demo' (a marca é gravada pelo "npm run deploy:demo", só no banco da demonstração). O banco real
--    nunca recebe essa marca, então um DEMO=true por engano na produção não liga nada.
CREATE TABLE IF NOT EXISTS ambiente (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

-- 2. Aviso dos arquivos que podem conter macros (.xlsm, e .doc/.xls do formato antigo), mostrado na Central.
ALTER TABLE arquivos ADD COLUMN aviso TEXT;
