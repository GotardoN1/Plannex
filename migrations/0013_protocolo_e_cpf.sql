-- Protocolo da solicitação (2026-10-04): PLX-ANO-NNNN, contado por ano (horário de Brasília) e na ordem
-- de chegada. Aparece para o cliente logo depois do envio, na ficha e na ordem de serviço.
-- CPF ou CNPJ do cliente, pedido no formulário ao lado do e-mail e usado na ordem de serviço.
ALTER TABLE contatos ADD COLUMN protocolo TEXT;
ALTER TABLE contatos ADD COLUMN cpf TEXT;

-- Último número usado em cada ano. Um contato excluído não devolve o número dele.
CREATE TABLE protocolos (
  ano INTEGER PRIMARY KEY,
  ultimo INTEGER NOT NULL
);

-- O que já existe ganha protocolo na ordem em que chegou.
UPDATE contatos SET protocolo = 'PLX-' || strftime('%Y', criado_em, '-3 hours') || '-' || printf('%04d', (
  SELECT COUNT(*) FROM contatos c2
  WHERE strftime('%Y', c2.criado_em, '-3 hours') = strftime('%Y', contatos.criado_em, '-3 hours')
    AND (c2.criado_em < contatos.criado_em OR (c2.criado_em = contatos.criado_em AND c2.id <= contatos.id))
));
INSERT INTO protocolos (ano, ultimo)
  SELECT CAST(strftime('%Y', criado_em, '-3 hours') AS INTEGER), COUNT(*) FROM contatos GROUP BY 1;

CREATE UNIQUE INDEX contatos_protocolo ON contatos (protocolo);
