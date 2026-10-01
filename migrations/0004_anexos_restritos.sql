-- Notas e ordens de serviço passam a ser só do administrador (mostram quanto a casa cobra).
-- Os registros de anexos que já existiam também saem da linha do tempo do funcionário.
UPDATE notas SET restrito = 1
WHERE tipo = 'sistema' AND (texto LIKE 'anexou %' OR texto LIKE 'removeu %');
