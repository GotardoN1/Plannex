-- Conclusão pelo administrador (2026-10-03): o funcionário entrega ("entregue") e a demanda volta para o
-- administrador, na coluna Conclusão do andamento; ele conclui de verdade ("concluido") ou devolve.
-- O que já estava entregue antes desta mudança foi finalizado: vira concluído.
UPDATE contatos SET etapa = 'concluido' WHERE etapa = 'entregue';

-- Materiais: quem vê cada arquivo. 'todos' (a equipe toda) ou 'admin' (só administradores).
ALTER TABLE materiais ADD COLUMN visibilidade TEXT NOT NULL DEFAULT 'todos' CHECK (visibilidade IN ('todos', 'admin'));
