-- Financeiro (2026-10-05): parte da equipe por demanda concluída (percentual do valor da demanda que vai
-- para o funcionário responsável). O resto segue a divisão de sempre (Parte da Plannex e sócios).
ALTER TABLE empresa ADD COLUMN pct_equipe REAL NOT NULL DEFAULT 50 CHECK (pct_equipe >= 0 AND pct_equipe <= 100);
