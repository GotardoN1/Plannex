-- Pedido iniciado (2026-10-04): o funcionário clica em "Iniciar pedido" antes de trabalhar e entregar,
-- para ficar claro em que ponto ele está (o administrador acompanha).
ALTER TABLE contatos ADD COLUMN iniciado_em TEXT;
-- O que já estava em Pedido conta como iniciado.
UPDATE contatos SET iniciado_em = atualizado_em WHERE etapa IN ('pedido', 'revisado', 'entregue', 'concluido');
