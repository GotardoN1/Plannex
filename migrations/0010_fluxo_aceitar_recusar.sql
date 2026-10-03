-- Novo fluxo (2026-10-03): a caixa de entrada tem Aceitar e Recusar; o andamento tem 4 etapas,
-- 1. Notas e ordens -> 2. Pedido -> 3. Revisão -> 4. Entregue. Processo iniciado deixa de existir.

-- Pedidos recusados ficam guardados (o lead não se perde) numa aba própria.
ALTER TABLE contatos ADD COLUMN recusado_em TEXT;

-- O que estava em "Pedido" (aceito, antes das notas) vai para Notas e ordens, a nova etapa 1.
UPDATE contatos SET etapa = 'nota_emitida' WHERE etapa = 'pedido';
-- O que estava em "Processo iniciado" (em trabalho com o responsável) vira "Pedido", a etapa 2.
UPDATE contatos SET etapa = 'pedido' WHERE etapa = 'processo_iniciado';

-- O molde em branco da ordem de serviço passa para Materiais (a OS preenchida sai do botão Gerar OS).
INSERT INTO materiais (nome, descricao, tipo, tamanho, chave, usuario_id, criado_em, atualizado_em)
  SELECT nome, 'Molde em branco da ordem de serviço', 'application/octet-stream', tamanho, chave, usuario_id, atualizado_em, atualizado_em
  FROM moldes WHERE tipo = 'ordem';
DELETE FROM moldes WHERE tipo = 'ordem';
