#!/usr/bin/env python3
"""Gera o Relatório de Auditoria de Segurança da Plannex (PDF, A4, pt-BR).

Uso (ambiente isolado, nada instalado globalmente):
    python3 -m venv .venv-auditoria
    .venv-auditoria/bin/pip install -r docs/security-audit/requirements.txt
    .venv-auditoria/bin/python docs/security-audit/gerar_relatorio.py

Os achados, os pontos fortes e as issues estão nos dados abaixo; edite-os e rode de novo.
"""
import io
import os
import textwrap
from datetime import date

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from reportlab.lib import colors  # noqa: E402
from reportlab.lib.enums import TA_CENTER, TA_LEFT  # noqa: E402
from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.lib.styles import ParagraphStyle  # noqa: E402
from reportlab.lib.units import cm  # noqa: E402
from reportlab.pdfbase import pdfmetrics  # noqa: E402
from reportlab.pdfbase.ttfonts import TTFont  # noqa: E402
from reportlab.platypus import (  # noqa: E402
    BaseDocTemplate, CondPageBreak, Flowable, Frame, Image, KeepTogether, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "relatorio-auditoria-seguranca.pdf")
PROJETO = "Plannex"
TITULO = f"Relatório de Auditoria de Segurança — {PROJETO}"
DATA = date(2026, 10, 10)
COMMIT = "36182b0"

# ---------------------------------------------------------------- fontes
FONTES = "/usr/share/fonts/truetype/dejavu"
for nome, arquivo in [("Sans", "DejaVuSans.ttf"), ("Sans-Bold", "DejaVuSans-Bold.ttf"),
                      ("Sans-Oblique", "DejaVuSans-Oblique.ttf"), ("Mono", "DejaVuSansMono.ttf"),
                      ("Mono-Bold", "DejaVuSansMono-Bold.ttf")]:
    pdfmetrics.registerFont(TTFont(nome, os.path.join(FONTES, arquivo)))
pdfmetrics.registerFontFamily("Sans", normal="Sans", bold="Sans-Bold", italic="Sans-Oblique", boldItalic="Sans-Bold")

# ---------------------------------------------------------------- paleta
SEV = {
    "crítica": "#B91C1C", "alta": "#EA580C", "média": "#D97706", "baixa": "#2563EB", "informativa": "#64748B",
}
FORTE = "#059669"
TINTA = colors.HexColor("#0F172A")
SUAVE = colors.HexColor("#475569")
LINHA = colors.HexColor("#E2E8F0")
FUNDO = colors.HexColor("#F8FAFC")
ORDEM_SEV = ["crítica", "alta", "média", "baixa", "informativa"]

# ---------------------------------------------------------------- dados da auditoria
CATEGORIAS = [
    ("C1", "Banco sem tranca (isolamento)"),
    ("C2", "Permissão definida no navegador"),
    ("C3", "IDOR"),
    ("C4", "Chaves expostas (hardcode)"),
    ("C5", "Inputs sem tratamento (XSS)"),
    ("FE", "Fora das cinco categorias"),
]
NOME_CAT = dict(CATEGORIAS)

STACK = [
    ("Linguagem", "JavaScript (ES modules), sem TypeScript nem build"),
    ("Runtime / framework", "Cloudflare Workers, roteamento manual em src/index.js (sem framework)"),
    ("Banco / acesso", "Cloudflare D1 (SQLite) com prepared statements e bind(); sem ORM"),
    ("Arquivos", "Cloudflare KV (binding ARQUIVOS); metadados na tabela arquivos"),
    ("Autenticação", "Usuário e senha (PBKDF2-SHA256, 100 mil iterações) e sessão em cookie HttpOnly, "
                     "Secure, SameSite=Strict; token aleatório de 32 bytes guardado como SHA-256 na tabela sessoes"),
    ("Autorização", "Dois papéis (admin, funcionario) e posse por contatos.responsavel_id"),
    ("Frontend", "Site estático (public/) e Central em JS puro (public/painel/js), DOM montado com textContent"),
    ("Deploy / CI", "wrangler.jsonc (produção e ambiente demo); sem Docker, Helm, Terraform ou CI no repositório"),
    ("Terceiros", "FormSubmit (e-mail do formulário, chamado pelo navegador); pdf-lib embarcado (vendor)"),
]

METODO = [
    ("C1", "Projeto de inquilino único (uma empresa). O isolamento é por papel e por dono: o funcionário só pode "
           "alcançar contatos com responsavel_id = ele, fora de arquivados, recusados e da etapa do administrador. "
           "Mecanismo: contatoVisivel() e filtros SQL em central() e consultaAtividade(). Também foi verificado o "
           "isolamento entre solicitantes anônimos do formulário público."),
    ("C2", "Cada gate de papel do frontend (TELAS admin em app.js, eAdmin() em ficha.js, materiais.js e demais) "
           "foi cruzado com a rota da API que ele aciona, conferindo a checagem no servidor."),
    ("C3", "Todas as rotas da função api() (src/index.js:179-279) foram listadas e cada handler que recebe ID "
           "foi seguido até a consulta, conferindo a verificação de posse ou de papel."),
    ("C4", "Varredura da árvore atual, dos 49 commits do histórico git, de wrangler.jsonc, ferramentas, testes, "
           "README e do JavaScript entregue ao navegador. Não há variáveis de ambiente secretas nem defaults "
           "do tipo ${VAR:-valor}; a sessão não depende de chave de assinatura."),
    ("C5", "Busca de sinks (innerHTML, insertAdjacentHTML, eval, new Function, href/src com dado do usuário, "
           "location.*) e de fontes (hash, query, postMessage). Backend: respostas HTML, cabeçalhos com nomes de "
           "arquivo, CSV e PDF gerados. Não há lib de sanitização: o projeto evita HTML por construção."),
]

# Achados. "issue": número da issue gerada no fim (None = sem issue, não acionável).
ACHADOS = [
    dict(id="A1", cat="C1", sev="média", issue=1,
         local=["src/index.js:362-367", "src/index.js:326-333", "public/assets/js/script.rev122.js:889"],
         titulo="Formulário público descarta o pedido de outra pessoa com o mesmo nome e devolve o protocolo dela",
         desc="A deduplicação do POST /api/contato considera repetido qualquer pedido com o mesmo serviço e o mesmo "
              "nome nos últimos 10 minutos, sem olhar e-mail, telefone ou texto. A segunda pessoa recebe ok, "
              "repetido: true e o protocolo do primeiro pedido; nada é gravado e o navegador também deixa de enviar "
              "o e-mail do FormSubmit. Reproduzido com o Worker: duas \"Maria Souza\" com e-mails, telefones e "
              "descrições diferentes resultaram em um único contato (o da primeira)."),
    dict(id="A2", cat="C4", sev="baixa", issue=4,
         local=["public/index.html:393-396", "public/assets/js/script.rev122.js:460"],
         titulo="Endpoint do FormSubmit com o e-mail real e captcha desligado",
         desc="O formulário publica o endereço contato@plannex.online como endpoint do FormSubmit e envia "
              "_captcha=false. Esse identificador funciona como credencial de envio: qualquer pessoa pode disparar "
              "e-mails para a caixa da Plannex direto no FormSubmit, sem passar pelo limite de 5 envios a cada "
              "10 minutos que a Central aplica."),
    dict(id="A3", cat="C4", sev="informativa", issue=None,
         local=["wrangler.jsonc:22", "wrangler.jsonc:28", "wrangler.jsonc:53", "wrangler.jsonc:58"],
         titulo="IDs do D1 e do KV versionados",
         desc="database_id e id dos namespaces KV estão no repositório público. Não são credenciais (sem um token "
              "da conta Cloudflare não dão acesso), é o padrão do wrangler. Registrado só para inventário."),
    dict(id="A4", cat="C4", sev="informativa", issue=None,
         local=["tests/apoio.mjs:9", "README.md:147"],
         titulo="Senhas de teste no código",
         desc="'senha-de-teste-123' e 'uma-senha-de-teste' só existem no banco em memória dos testes e no exemplo "
              "do servidor local; nenhum usuário real é criado com elas (as migrações não inserem usuários)."),
    dict(id="A5", cat="C4", sev="informativa", issue=None,
         local=["public/painel/js/mensagens.js:6"],
         titulo="Chave PIX embutida no JavaScript",
         desc="A chave PIX vai em toda mensagem de aceite para o cliente; é pública por natureza e não é segredo. "
              "Fica só o registro de que é um dado pessoal (número de telefone) servido em /painel/js."),
    dict(id="A6", cat="C5", sev="informativa", issue=4,
         local=["public/index.html:395", "public/assets/js/script.rev122.js:871", "public/assets/js/script.rev122.js:887"],
         titulo="E-mail do formulário montado por terceiro com dados do cliente",
         desc="Nome e campos livres entram no assunto e no corpo do e-mail gerado pelo FormSubmit (template "
              "\"table\"). O escape desse HTML fica fora do controle do projeto; não foi possível verificar."),
    dict(id="A7", cat="FE", sev="baixa", issue=2,
         local=["src/index.js:533-537", "src/index.js:543-546"],
         titulo="Qualquer pessoa trava o login de um usuário por 15 minutos",
         desc="O limite de 5 tentativas por usuário vale para qualquer IP. Sabendo um login (ex.: o do "
              "administrador), um anônimo erra 5 vezes e a conta fica bloqueada, mesmo com a senha certa. "
              "Reproduzido: login correto da Ana respondeu 429 depois de 5 erros de terceiros."),
    dict(id="A8", cat="FE", sev="baixa", issue=3,
         local=["src/index.js:1413-1416", "src/index.js:350"],
         titulo="Limite de 32 KB do JSON depende do Content-Length",
         desc="lerJson() só recusa corpos grandes quando o cabeçalho Content-Length existe. Sem ele (envio em "
              "stream/chunked), request.json() lê o corpo inteiro. Reproduzido: 5 MB sem Content-Length foram "
              "aceitos em PATCH /api/eu. Vale também para o POST /api/contato, que é público."),
]

# Pontos fortes, por categoria, com evidência.
FORTES = [
    ("C1", "contatoVisivel() (src/index.js:281-286) é aplicado antes de todo handler de /api/contatos/:id "
           "(224-237), de arquivos (1175-1179) e de notas (1095)."),
    ("C1", "/api/central filtra os contatos do funcionário no SQL e zera telefone, e-mail, CPF, valor, nota "
           "fiscal e pagamento antes de responder (790, 816-824); usuários: só ele mesmo (806)."),
    ("C1", "Atividade e linha do tempo filtram por responsável e escondem anotações restritas "
           "(consultaAtividade 762-777; linhaDoTempo 1056-1068)."),
    ("C1", "Arquivos, moldes e materiais filtrados por categoria e visibilidade nas listagens "
           "(listarArquivos 1115-1123; central 800, 809-813)."),
    ("C1", "Sonda executada contra o Worker: a funcionária Bia recebeu só os contatos 10 e 11, com os campos "
           "de contato e financeiros nulos."),
    ("C2", "Todas as telas marcadas admin: true (public/painel/js/app.js:24-33) têm checagem no servidor: "
           "financeiro e despesas (src/index.js:206-216), equipe (222, 269-276), novo contato (221)."),
    ("C2", "alterarContato aceita do funcionário só as chaves etapa, lido e iniciado (858) e limita as etapas "
           "(861-872); a anotação na aba Notas e ordens exige admin (1086)."),
    ("C2", "Categorias de arquivo do administrador (nota, ordem, outro) barradas no envio, listagem e download "
           "(1111, 1116, 1134, 1177); molde da OS só para admin (246)."),
    ("C2", "CSRF: toda escrita exige Origin igual ao site (184) e o cookie é SameSite=Strict (558)."),
    ("C2", "Modo demonstração (entrar sem senha) só liga com três marcas: DEMO=true, AMBIENTE=demo, banco e KV "
           "marcados como demo (86-115). Testado: em produção /api/demo/entrar responde 404."),
    ("C3", "Todas as 42 combinações de rota e método foram percorridas (ver Cobertura). Nenhum handler busca, "
           "altera ou apaga por ID sem conferir papel ou posse."),
    ("C3", "DELETE /api/etiquetas/:id apaga só com usuario_id do chamador (721); DELETE /api/notas/:id exige "
           "demanda visível e autoria (1091-1098)."),
    ("C3", "GET e DELETE /api/arquivos/:id passam por arquivoVisivel() (1175-1179), e o funcionário só apaga "
           "o que ele enviou e com a demanda aberta (1346-1351)."),
    ("C3", "GET /api/materiais/:id respeita visibilidade admin (1263); rotas de usuários e despesas exigem admin."),
    ("C3", "Sonda: 9 tentativas de IDOR da funcionária contra objetos alheios foram barradas (404/403; na "
           "etiqueta alheia, 200 sem apagar nada)."),
    ("C4", "Nenhum segredo na árvore nem nos 49 commits; nenhum .env ou .dev.vars versionado (.gitignore cobre "
           ".dev.vars e backups/)."),
    ("C4", "Não existe segredo de assinatura a vazar: a sessão é um token aleatório de 32 bytes guardado como "
           "SHA-256 (553-559, 603-610)."),
    ("C4", "Senhas com PBKDF2-SHA256, sal de 16 bytes e comparação em tempo constante (src/senha.js:9-33); "
           "login confere um hash falso para não denunciar usuários inexistentes (539-541)."),
    ("C4", "tools/criar-usuario.mjs pede a senha sem ecoar e grava só o hash; as migrações não criam usuário padrão."),
    ("C5", "A Central monta o DOM com el() e textContent (public/painel/js/util.js:2, 39-47); o único innerHTML "
           "recebe ícones fixos (util.js:135)."),
    ("C5", "No site, innerHTML só recebe textos fixos (script.rev122.js:876, 911, 916, 927)."),
    ("C5", "Links de WhatsApp e e-mail têm esquema fixo e encodeURIComponent (mensagens.js:115-124): sem "
           "javascript:. Rotas por hash são validadas contra a lista de telas (app.js:46-49)."),
    ("C5", "CSP sem unsafe-inline nem unsafe-eval, frame-ancestors 'none', nosniff e HSTS (public/_headers:1-10)."),
    ("C5", "Downloads sempre como anexo octet-stream com nosniff (src/index.js:1187-1195, 1205-1213, 1266-1274); "
           "nomes de arquivo higienizados (1154) e conteúdo conferido pela assinatura (src/arquivos.js)."),
    ("C5", "Exportação CSV neutraliza fórmulas =, +, - e @ (entrada.js:280-283) e o servidor remove tabulação e "
           "CR dos textos (src/index.js:1418-1426)."),
    ("C5", "SQL dinâmico só com nomes de coluna fixos no código (434-449, 471-480, 292-303); valores sempre por bind()."),
]

PONTOS_FRACOS = [
    "O único achado de severidade média está no formulário público: a regra anti-duplicidade usa o nome como "
    "identidade, o que faz pedidos de pessoas diferentes colidirem e sumirem sem rastro (A1).",
    "O canal de e-mail depende de um terceiro configurado com o endereço real e sem captcha, fora do limite de "
    "envios da Central (A2, A6).",
    "Duas proteções contra abuso têm brecha: o bloqueio de login por usuário vira ferramenta para travar contas "
    "(A7) e o teto de 32 KB do JSON depende de um cabeçalho que o cliente controla (A8).",
]

COBERTURA = [
    ("POST /api/contato", "Público: limite por IP, honeypot, validação de arquivos", "335-395"),
    ("/api/demo/*", "404 sem demonstração confirmada", "189, 86-115"),
    ("POST /api/login · POST /api/sair", "Limite por IP e usuário; hash falso; apaga a sessão", "527-551, 595-601"),
    ("GET /api/sessao · GET /api/versao", "Sessão obrigatória", "195-203"),
    ("GET /api/financeiro · PATCH /api/empresa", "Só admin", "206-207"),
    ("POST /api/despesas · PATCH, DELETE /api/despesas/:id · POST …/renovar", "Só admin", "208-216"),
    ("GET /api/central · GET /api/atividade", "Filtro por papel e responsável", "762-826"),
    ("POST /api/senha · PATCH /api/eu", "Senha atual; só o próprio id", "612-628, 688-702"),
    ("POST /api/contatos · POST /api/usuarios", "Só admin", "221-222"),
    ("PATCH, DELETE /api/contatos/:id", "contatoVisivel; lista de chaves do funcionário; DELETE só admin", "228-231, 858"),
    ("GET /api/contatos/:id/linha-do-tempo", "contatoVisivel; esconde restritas", "232, 1056-1068"),
    ("POST /api/contatos/:id/notas", "contatoVisivel; aba do admin; demanda fechada", "233, 1081-1089"),
    ("GET, POST /api/contatos/:id/arquivos", "contatoVisivel; categoria por papel", "234-235, 1115-1148"),
    ("POST /api/contatos/:id/etiquetas", "contatoVisivel; etiqueta pessoal", "236, 707-718"),
    ("GET, DELETE /api/arquivos/:id", "arquivoVisivel; autor e etapa", "239-241, 1175-1196, 1343-1359"),
    ("GET, POST, DELETE /api/moldes/:tipo", "OS só admin; envio e exclusão só admin", "243-250"),
    ("POST /api/materiais · GET, POST, PATCH, DELETE /api/materiais/:id", "Visibilidade; escrita só admin", "252-261, 1261-1341"),
    ("DELETE /api/etiquetas/:id", "Filtra por usuario_id", "263-264, 720-723"),
    ("DELETE /api/notas/:id", "Demanda visível e autoria", "266-267, 1091-1098"),
    ("PATCH, DELETE /api/usuarios/:id · POST …/senha", "Só admin; não altera a si mesmo", "269-276"),
]

RECOMENDACOES = [
    ("P1", "Corrigir a deduplicação do formulário (A1)",
     "Considerar repetido só o mesmo pedido (e-mail ou telefone e o mesmo texto, ou um hash do conteúdo todo); "
     "nunca devolver o protocolo de outro registro; quando houver dúvida, gravar o contato e deixar a triagem "
     "para a caixa de entrada. Adicionar teste com duas pessoas de mesmo nome."),
    ("P2", "Endurecer o canal de e-mail (A2, A6)",
     "Trocar o endereço pelo alias aleatório do FormSubmit, ligar o captcha ou, melhor, enviar o e-mail pelo "
     "próprio Worker (depois do limite por IP) com um serviço transacional e template escapado."),
    ("P3", "Bloqueio de login sem efeito colateral (A7)",
     "Contar falhas por usuário e IP juntos, usar espera progressiva em vez de bloqueio total e/ou exigir "
     "Cloudflare Turnstile depois de algumas falhas."),
    ("P4", "Teto de tamanho que não dependa do cliente (A8)",
     "Ler o corpo como stream com limite de bytes (ou recusar requisição sem Content-Length) antes do "
     "request.json(), no formulário público e na API."),
    ("P5", "Transformar a sonda desta auditoria em testes de regressão",
     "As tentativas de IDOR e de escalada de papel que foram barradas viram um tests/seguranca.test.mjs, para "
     "a proteção não regredir em mudanças futuras."),
]

ISSUES = [
    (1, "[Segurança] Formulário público descarta o pedido de outra pessoa com o mesmo nome e devolve o protocolo dela",
     "security, severidade: média", """\
## Descrição
A deduplicação do `POST /api/contato` trata como "repetido" qualquer pedido com o **mesmo serviço e o mesmo nome**
recebido nos últimos 10 minutos, sem comparar e-mail, telefone ou texto. Duas pessoas diferentes com nome comum
(ex.: "Maria Souza") colidem: a segunda recebe `ok: true`, `repetido: true` e o **protocolo da primeira**, nada é
gravado na Central e o navegador também **deixa de enviar o e-mail** do FormSubmit. O pedido some sem rastro.

É explorável de dois jeitos: por acaso (nomes comuns no mesmo serviço) ou de propósito, por quem envia um pedido
com o nome de outra pessoa logo antes dela, fazendo o pedido real ser descartado.

## Evidência
`src/index.js:362-367`
```js
const repetido = await env.DB.prepare(
  "SELECT id, protocolo FROM contatos WHERE servico = ? AND nome = ? AND criado_em > " +
  "strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-10 minutes')"   // (linha 364, quebrada aqui para caber)
).bind(servico, campos.nome).first() || await pedidoRepetido(env, campos);
...
if (repetido) return json({ ok: true, repetido: true, protocolo: repetido.protocolo }, 200);
```
`public/assets/js/script.rev122.js:889`
```js
const emailOk = central.repetido ? true : await fetch(FORM_SUBMIT_ENDPOINT, { ... })
```
Reprodução (harness dos testes): duas "Maria Souza" com e-mails, telefones e descrições diferentes -> a segunda
recebeu `{"ok":true,"repetido":true,"protocolo":"PLX-2026-0001"}` e o banco ficou com um único contato.

## Impacto
Perda silenciosa de pedidos de clientes (sem registro na Central e sem e-mail) e exposição do protocolo de
outra pessoa ao solicitante.

## Sugestão de correção
- Remover a regra por `servico + nome`; manter só `pedidoRepetido` (e-mail **ou** telefone + mesma descrição),
  ou comparar um hash de todos os campos enviados.
- Não devolver o protocolo de outro registro: no caso repetido, responder só `ok: true, repetido: true`.
- Na dúvida, gravar o contato e deixar a triagem para a caixa de entrada.

## Critérios de aceite
- [ ] Dois envios com mesmo nome e serviço, mas e-mail/telefone ou texto diferentes, geram dois contatos.
- [ ] Reenvio idêntico (clique duplo) continua sem duplicar.
- [ ] A resposta de um envio repetido não traz o protocolo de outro registro.
- [ ] Teste automatizado cobrindo os três casos acima.
"""),
    (2, "[Segurança] Qualquer pessoa consegue travar o login de um usuário por 15 minutos",
     "security, severidade: baixa", """\
## Descrição
O limite de tentativas de login conta falhas por **usuário**, vindas de qualquer IP. Quem souber um login (ex.:
o do administrador) erra a senha 5 vezes e a conta fica bloqueada por 15 minutos, inclusive para o dono com a
senha certa. Repetindo a cada 15 minutos, o bloqueio é permanente.

## Evidência
`src/index.js:533-537`
```js
const chaveIp = `login-ip:${await hashIp(request)}`;
const chaveUsuario = `login-usuario:${usuario}`;
if (await excedeuLimite(env, chaveIp, LIMITE_LOGIN)
    || await excedeuLimite(env, chaveUsuario, LIMITE_LOGIN)) {   // (linha 535, quebrada aqui para caber)
  return json({ erro: 'Muitas tentativas. Aguarde 15 minutos.' }, 429);
```
Reprodução: após 5 falhas de terceiros, o login correto da usuária `ana` respondeu `429`.

## Impacto
Negação de acesso à Central para administradores e equipe.

## Sugestão de correção
- Contar falhas por `usuário + IP`; manter o limite por IP como está.
- Para o limite global por usuário, usar espera progressiva ou exigir Cloudflare Turnstile em vez de bloquear.

## Critérios de aceite
- [ ] Falhas vindas de outro IP não impedem o login correto do usuário.
- [ ] Força bruta de um mesmo IP continua limitada.
- [ ] Teste automatizado do cenário acima.
"""),
    (3, "[Segurança] Limite de 32 KB do corpo JSON pode ser contornado sem Content-Length",
     "security, severidade: baixa", """\
## Descrição
`lerJson()` só recusa corpos grandes quando o cabeçalho `Content-Length` existe. Enviando o corpo em stream
(chunked, sem `Content-Length`), `request.json()` lê tudo. O mesmo helper atende o `POST /api/contato`, que é
público (a checagem de `Origin` não impede chamadas fora do navegador).

## Evidência
`src/index.js:1413-1416`
```js
async function lerJson(request) {
  if (Number(request.headers.get('Content-Length') || 0) > 32000) return null;
  return request.json().catch(() => null);
}
```
Reprodução: `PATCH /api/eu` com 5 MB sem `Content-Length` respondeu `200 {"ok":true}`; com o cabeçalho, `400`.

## Impacto
Consumo de CPU e memória do Worker com corpos grandes, contornando o teto pensado para a API.

## Sugestão de correção
- Ler `request.body` com um contador de bytes e abortar ao passar de 32 KB, ou recusar escritas sem
  `Content-Length`.

## Critérios de aceite
- [ ] Corpo de mais de 32 KB é recusado com e sem `Content-Length`.
- [ ] Teste automatizado com corpo em stream.
"""),
    (4, "[Segurança] Endpoint do FormSubmit com e-mail real, sem captcha, e e-mail montado por terceiro",
     "security, severidade: baixa", """\
## Descrição
O formulário do site usa o endereço real `contato@plannex.online` como endpoint do FormSubmit e envia
`_captcha=false`. Esse endereço funciona como credencial de envio: qualquer pessoa pode disparar e-mails para a
caixa da Plannex direto no FormSubmit, sem passar pelo limite de envios da Central (5 a cada 10 minutos por IP).
Além disso, nome e campos livres do cliente entram no assunto e no corpo de um e-mail montado pelo FormSubmit
(template "table"), cujo escape de HTML está fora do controle do projeto.

## Evidência
`public/index.html:393-396`
```html
<form action="https://formsubmit.co/contato@plannex.online" ...>
<input name="_template" type="hidden" value="table"/>
<input name="_captcha" type="hidden" value="false"/>
```
`public/assets/js/script.rev122.js:460`
```js
const FORM_SUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/contato@plannex.online';
```
`public/assets/js/script.rev122.js:887`
```js
formData.set('_subject', `Plannex · ${central.protocolo} · Nova solicitação · ${serviceLabel} · ${name}`);
```

## Impacto
Spam e e-mails falsos de "nova solicitação" na caixa da empresa (inclusive imitando pedidos reais) e
dependência de um terceiro para escapar o conteúdo enviado pelo cliente.

## Sugestão de correção
- Trocar o endereço pelo alias aleatório que o FormSubmit oferece e ativar o captcha; ou
- Preferível: enviar o e-mail pelo próprio Worker, depois do limite por IP, com um serviço transacional e
  template com escape.

## Critérios de aceite
- [ ] O endereço real não aparece no HTML nem no JavaScript do site.
- [ ] Envios automatizados direto ao endpoint de e-mail são barrados (captcha ou limite no servidor).
- [ ] Dados do cliente no e-mail passam por escape controlado pelo projeto (se o envio sair do Worker).
"""),
]

# ---------------------------------------------------------------- estilos
def estilo(nome, **kw):
    base = dict(fontName="Sans", fontSize=9.5, leading=13.5, textColor=TINTA)
    base.update(kw)
    return ParagraphStyle(nome, **base)

E = {
    "h1": estilo("h1", fontName="Sans-Bold", fontSize=17, leading=22, spaceBefore=4, spaceAfter=10),
    "h2": estilo("h2", fontName="Sans-Bold", fontSize=12.5, leading=17, spaceBefore=12, spaceAfter=6, keepWithNext=1),
    "h3": estilo("h3", fontName="Sans-Bold", fontSize=10.5, leading=14, spaceBefore=8, spaceAfter=4, keepWithNext=1),
    "p": estilo("p", spaceAfter=6),
    "pequeno": estilo("pequeno", fontSize=8.2, leading=11, textColor=SUAVE),
    "celula": estilo("celula", fontSize=8.2, leading=11),
    "celula_b": estilo("celula_b", fontName="Sans-Bold", fontSize=8.2, leading=11),
    "celula_mono": estilo("celula_mono", fontName="Mono", fontSize=7.0, leading=9.6),
    "cabec": estilo("cabec", fontName="Sans-Bold", fontSize=8.2, leading=11, textColor=colors.white),
    "chip": estilo("chip", fontName="Sans-Bold", fontSize=7.2, leading=9, textColor=colors.white, alignment=TA_CENTER),
    "capa_t": estilo("capa_t", fontName="Sans-Bold", fontSize=26, leading=32, textColor=colors.white),
    "capa_s": estilo("capa_s", fontSize=11, leading=16, textColor=colors.HexColor("#CBD5E1")),
    "kpi_n": estilo("kpi_n", fontName="Sans-Bold", fontSize=20, leading=24, alignment=TA_CENTER),
    "kpi_t": estilo("kpi_t", fontSize=7.8, leading=10, textColor=SUAVE, alignment=TA_CENTER),
}
LARGURA = A4[0] - 4 * cm


def esc(texto):
    return texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def chip(sev):
    cor = colors.HexColor(SEV.get(sev, FORTE))
    t = Table([[Paragraph(sev.upper(), E["chip"])]], colWidths=[2.15 * cm], rowHeights=[0.48 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), cor), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [5, 5, 5, 5]), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return t


def tabela(linhas, larguras, cabecalho=True, zebra=True):
    t = Table(linhas, colWidths=larguras, repeatRows=1 if cabecalho else 0)
    estilos = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINHA),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if cabecalho:
        estilos += [("BACKGROUND", (0, 0), (-1, 0), TINTA)]
    if zebra:
        for i in range(1 if cabecalho else 0, len(linhas)):
            if i % 2 == 0:
                estilos.append(("BACKGROUND", (0, i), (-1, i), FUNDO))
    t.setStyle(TableStyle(estilos))
    return t


class BlocoCodigo(Flowable):
    """Texto monoespaçado com quebra de linha, fundo e bordas; se divide entre páginas."""

    def __init__(self, linhas, fonte=7.3, entrelinha=9.4, marcador=False):
        super().__init__()
        self.linhas, self.fonte, self.entrelinha, self.marcador = linhas, fonte, entrelinha, marcador
        self.pad = 6

    def wrap(self, w, h):
        self.largura = w
        self.altura = len(self.linhas) * self.entrelinha + 2 * self.pad
        return w, self.altura

    def split(self, w, h):
        cabem = int((h - 2 * self.pad) // self.entrelinha)
        if cabem < 4 or cabem >= len(self.linhas):
            return [] if cabem < 4 else [self]
        return [BlocoCodigo(self.linhas[:cabem], self.fonte, self.entrelinha, self.marcador),
                BlocoCodigo(self.linhas[cabem:], self.fonte, self.entrelinha, self.marcador)]

    def draw(self):
        c = self.canv
        c.setFillColor(colors.HexColor("#F1F5F9"))
        c.setStrokeColor(LINHA)
        c.roundRect(0, 0, self.largura, self.altura, 4, fill=1, stroke=1)
        y = self.altura - self.pad - self.fonte
        for linha in self.linhas:
            negrito = linha.startswith("--- ISSUE") or linha.startswith("--- FIM ISSUE")
            c.setFont("Mono-Bold" if negrito else "Mono", self.fonte)
            c.setFillColor(colors.HexColor("#059669") if negrito else TINTA)
            c.drawString(self.pad, y, linha)
            y -= self.entrelinha


def desembrulhar(corpo):
    """Junta as linhas de um mesmo parágrafo ou item de lista (fora dos blocos de código), para que a única
    quebra seja a do PDF e o Markdown copiado continue válido."""
    saida, em_codigo = [], False
    for linha in corpo.splitlines():
        s = linha.strip()
        if s.startswith("```"):
            em_codigo = not em_codigo
            saida.append(linha)
            continue
        caminho = s.startswith("`") and s.endswith("`") and " " not in s
        continua = (not em_codigo and s and saida and saida[-1].strip() and not s.startswith(("#", "- ", "```"))
                    and not caminho and not saida[-1].strip().startswith(("#", "```", "--- "))
                    and not (saida[-1].strip().startswith("`") and saida[-1].strip().endswith("`") and " " not in saida[-1].strip()))
        if continua:
            saida[-1] = saida[-1].rstrip() + " " + s
        else:
            saida.append(linha)
    return "\n".join(saida)


def quebrar(texto, largura=104):
    saida = []
    for linha in texto.splitlines():
        if not linha.strip():
            saida.append("")
            continue
        recuo = len(linha) - len(linha.lstrip())
        extra = 2 if linha.lstrip().startswith("- ") else 0
        partes = textwrap.wrap(linha, width=largura, subsequent_indent=" " * (recuo + extra),
                               break_long_words=True, break_on_hyphens=False)
        saida.extend(p.rstrip() for p in partes)
    return saida


# ---------------------------------------------------------------- gráficos
def figura_png(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=220, bbox_inches="tight", transparent=False, facecolor="white")
    plt.close(fig)
    buf.seek(0)
    return buf


def grafico_rosca():
    contagem = [(s, sum(1 for a in ACHADOS if a["sev"] == s)) for s in ORDEM_SEV]
    contagem = [(s, n) for s, n in contagem if n]
    fig, ax = plt.subplots(figsize=(3.4, 3.0))
    plt.rcParams["font.family"] = "DejaVu Sans"
    ax.pie([n for _, n in contagem], colors=[SEV[s] for s, _ in contagem], startangle=90, counterclock=False,
           wedgeprops=dict(width=0.36, edgecolor="white", linewidth=2))
    ax.text(0, 0.08, str(len(ACHADOS)), ha="center", va="center", fontsize=22, fontweight="bold", color="#0F172A")
    ax.text(0, -0.2, "achados", ha="center", va="center", fontsize=9, color="#475569")
    ax.legend([f"{s.capitalize()} ({n})" for s, n in contagem], loc="upper center", bbox_to_anchor=(0.5, -0.02),
              ncol=2, frameon=False, fontsize=8, handlelength=1, handleheight=1)
    ax.set_title("Achados por severidade", fontsize=10, fontweight="bold", color="#0F172A", pad=4)
    ax.axis("equal")
    return figura_png(fig)


def grafico_barras():
    cats = [c for c, _ in CATEGORIAS]
    rotulos = ["C1\nIsolamento", "C2\nPermissão", "C3\nIDOR", "C4\nChaves", "C5\nXSS", "Fora das\n5 cat."]
    fig, ax = plt.subplots(figsize=(4.4, 3.0))
    plt.rcParams["font.family"] = "DejaVu Sans"
    larg = 0.38
    xs = range(len(cats))
    base = [0] * len(cats)
    for s in ORDEM_SEV:
        valores = [sum(1 for a in ACHADOS if a["cat"] == c and a["sev"] == s) for c in cats]
        if any(valores):
            ax.bar([x - larg / 2 for x in xs], valores, larg, bottom=base, color=SEV[s], label=s.capitalize(),
                   edgecolor="white", linewidth=0.8)
            base = [b + v for b, v in zip(base, valores)]
    fortes = [sum(1 for c2, _ in FORTES if c2 == c) for c in cats]
    ax.bar([x + larg / 2 for x in xs], fortes, larg, color=FORTE, label="Ponto forte", edgecolor="white", linewidth=0.8)
    ax.set_xticks(list(xs))
    ax.set_xticklabels(rotulos, fontsize=7)
    ax.tick_params(axis="y", labelsize=7)
    ax.yaxis.get_major_locator().set_params(integer=True)
    for lado in ("top", "right"):
        ax.spines[lado].set_visible(False)
    ax.spines["left"].set_color("#CBD5E1")
    ax.spines["bottom"].set_color("#CBD5E1")
    ax.grid(axis="y", color="#E2E8F0", linewidth=0.6)
    ax.set_axisbelow(True)
    ax.legend(fontsize=7, frameon=False, loc="upper left", ncol=2)
    ax.set_ylim(0, max(max(fortes), max(base)) + 2.2)
    ax.set_title("Achados e pontos fortes por categoria", fontsize=10, fontweight="bold", color="#0F172A")
    return figura_png(fig)


# ---------------------------------------------------------------- páginas
def pagina_capa(c, doc):
    c.saveState()
    largura, altura = A4
    c.setFillColor(TINTA)
    c.rect(0, 0, largura, altura, fill=1, stroke=0)
    c.setFillColor(colors.HexColor(FORTE))
    c.rect(0, altura - 0.6 * cm, largura, 0.6 * cm, fill=1, stroke=0)
    c.restoreState()


def pagina_normal(c, doc):
    c.saveState()
    largura, altura = A4
    c.setStrokeColor(LINHA)
    c.setLineWidth(0.6)
    c.line(2 * cm, altura - 1.45 * cm, largura - 2 * cm, altura - 1.45 * cm)
    c.line(2 * cm, 1.45 * cm, largura - 2 * cm, 1.45 * cm)
    c.setFont("Sans", 7.8)
    c.setFillColor(SUAVE)
    c.drawString(2 * cm, altura - 1.25 * cm, TITULO)
    c.drawRightString(largura - 2 * cm, altura - 1.25 * cm, f"Commit {COMMIT} · {DATA.strftime('%d/%m/%Y')}")
    c.drawString(2 * cm, 1.05 * cm, "Confidencial — uso interno da Plannex")
    c.drawRightString(largura - 2 * cm, 1.05 * cm, f"Página {doc.page}")
    c.restoreState()


def capa():
    itens = [Spacer(1, 3.2 * cm),
             Paragraph("RELATÓRIO DE AUDITORIA DE SEGURANÇA", estilo("x", fontName="Sans-Bold", fontSize=9, textColor=colors.HexColor(FORTE))),
             Spacer(1, 0.3 * cm),
             Paragraph(esc(TITULO), E["capa_t"]), Spacer(1, 0.5 * cm),
             Paragraph(f"Data: {DATA.strftime('%d/%m/%Y')} &nbsp;·&nbsp; Repositório GotardoN1/Plannex, branch master, commit {COMMIT}", E["capa_s"]),
             Spacer(1, 1.1 * cm)]
    branco = estilo("cb", textColor=colors.white, fontSize=9.2, leading=13.5)
    rotulo = estilo("cr", fontName="Sans-Bold", textColor=colors.HexColor("#94A3B8"), fontSize=8, leading=11)
    itens.append(Paragraph("ESCOPO AUDITADO", rotulo))
    itens.append(Spacer(1, 0.15 * cm))
    itens.append(Paragraph(
        "Todo o backend (src/index.js, src/arquivos.js, src/senha.js, src/demo.js), o frontend da Central "
        "(public/painel/js), o JavaScript e o HTML do site público, public/_headers, wrangler.jsonc, as 16 "
        "migrações, tools/, tests/, README e os 49 commits do histórico git. O código foi lido por inteiro e os "
        "controles de acesso foram exercitados contra o próprio Worker, num banco em memória com dados fictícios.", branco))
    itens.append(Spacer(1, 0.6 * cm))
    itens.append(Paragraph("NOTA METODOLÓGICA — COMO CADA CATEGORIA FOI MAPEADA PARA A STACK", rotulo))
    itens.append(Spacer(1, 0.15 * cm))
    for cod, texto in METODO:
        itens.append(Paragraph(f"<b>{cod} · {NOME_CAT[cod]}.</b> {esc(texto)}", estilo("cm", textColor=colors.HexColor("#E2E8F0"), fontSize=8.4, leading=12, spaceAfter=5)))
    itens.append(Spacer(1, 0.3 * cm))
    itens.append(Paragraph(
        "Só entram achados verificados no código real. Os itens marcados como reproduzidos foram confirmados "
        "executando o Worker. Achados fora das cinco categorias aparecem à parte e não alteram a análise delas.",
        estilo("cn", textColor=colors.HexColor("#94A3B8"), fontSize=7.8, leading=11)))
    return itens


def resumo():
    itens = [NextPageTemplate("normal"), PageBreak(), Paragraph("1. Resumo executivo", E["h1"])]
    contagem = {s: sum(1 for a in ACHADOS if a["sev"] == s) for s in ORDEM_SEV}
    kpis = [[Paragraph(str(contagem[s]), estilo(f"k{s}", fontName="Sans-Bold", fontSize=20, leading=24,
                                                 alignment=TA_CENTER, textColor=colors.HexColor(SEV[s]))) for s in ORDEM_SEV]
            + [Paragraph(str(len(FORTES)), estilo("kf", fontName="Sans-Bold", fontSize=20, leading=24, alignment=TA_CENTER, textColor=colors.HexColor(FORTE)))],
            [Paragraph(s.capitalize(), E["kpi_t"]) for s in ORDEM_SEV] + [Paragraph("Pontos fortes", E["kpi_t"])]]
    t = Table(kpis, colWidths=[LARGURA / 6] * 6)
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, LINHA), ("INNERGRID", (0, 0), (-1, -1), 0.4, LINHA),
                           ("BACKGROUND", (0, 0), (-1, -1), FUNDO), ("TOPPADDING", (0, 0), (-1, -1), 6),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("ROUNDEDCORNERS", [6, 6, 6, 6])]))
    itens += [t, Spacer(1, 0.4 * cm)]
    itens.append(Paragraph(
        "A Central está bem protegida nos pontos que mais importam: <b>não foi encontrada nenhuma falha crítica ou "
        "alta</b>, nenhum IDOR, nenhuma permissão decidida só no navegador e nenhum segredo no código ou no "
        "histórico. O isolamento entre administrador e funcionário é aplicado no servidor em todas as rotas, e o "
        "frontend não usa HTML com dados de usuário, com uma CSP rígida por cima. O risco central está no "
        "<b>formulário público</b>: a regra anti-duplicidade faz pedidos de pessoas diferentes com o mesmo nome "
        "sumirem sem rastro (média). Os demais itens são proteções contra abuso com brechas pequenas e registros "
        "informativos.", E["p"]))
    graf = Table([[Image(grafico_rosca(), width=5.9 * cm, height=5.9 * cm * 3.35 / 3.4),
                   Image(grafico_barras(), width=8.9 * cm, height=8.9 * cm * 3.25 / 4.4)]],
                 colWidths=[6.9 * cm, LARGURA - 6.9 * cm])
    graf.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    itens += [Spacer(1, 0.2 * cm), graf, Spacer(1, 0.2 * cm)]
    itens.append(Paragraph(
        f"Total: {len(ACHADOS)} achados ({sum(1 for a in ACHADOS if a['cat'] != 'FE')} nas cinco categorias e "
        f"{sum(1 for a in ACHADOS if a['cat'] == 'FE')} fora delas). Os informativos não pedem correção; viram issue "
        "só os acionáveis.", E["pequeno"]))
    itens.append(Paragraph("Stack detectada", E["h2"]))
    linhas = [[Paragraph("Camada", E["cabec"]), Paragraph("O que foi encontrado", E["cabec"])]]
    linhas += [[Paragraph(a, E["celula_b"]), Paragraph(esc(b), E["celula"])] for a, b in STACK]
    itens.append(tabela(linhas, [3.6 * cm, LARGURA - 3.6 * cm]))
    return itens


def fortes_fracos():
    itens = [PageBreak(), Paragraph("2. Pontos fortes e pontos fracos", E["h1"]),
             Paragraph("Pontos fortes — o que está protegido, com evidência", E["h2"])]
    for cod, nome in CATEGORIAS[:5]:
        linhas = [[Paragraph(f"{cod} · {nome}", E["cabec"])]]
        linhas += [[Paragraph("<font color='%s'>●</font>&nbsp; %s" % (FORTE, esc(t)), E["celula"])] for c, t in FORTES if c == cod]
        tb = tabela(linhas, [LARGURA])
        tb.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(FORTE))]))
        itens += [KeepTogether([tb]), Spacer(1, 0.25 * cm)]
    itens.append(Paragraph("Pontos fracos — os riscos centrais", E["h2"]))
    linhas = [[Paragraph("<font color='%s'>●</font>&nbsp; %s" % (SEV["média"], esc(t)), E["celula"])] for t in PONTOS_FRACOS]
    itens.append(tabela(linhas, [LARGURA], cabecalho=False))
    return itens


def achados():
    itens = [PageBreak(), Paragraph("3. Achados detalhados por categoria", E["h1"]),
             Paragraph("Arquivo por arquivo, linha por linha. Caminhos relativos à raiz do repositório.", E["pequeno"]),
             Spacer(1, 0.2 * cm)]
    larguras = [2.45 * cm, 5.9 * cm, LARGURA - 8.35 * cm]
    for cod, nome in CATEGORIAS:
        lista = sorted([a for a in ACHADOS if a["cat"] == cod], key=lambda a: ORDEM_SEV.index(a["sev"]))
        bloco = [Paragraph(f"{cod} · {nome}" if cod != "FE" else nome, E["h2"])]
        if not lista:
            bloco.append(Paragraph(
                "<font color='%s'><b>Nenhum achado.</b></font> Todas as verificações desta categoria passaram; a "
                "evidência está em Pontos fortes e na tabela de Cobertura." % FORTE, E["p"]))
            itens += bloco
            continue
        linhas = [[Paragraph("Severidade", E["cabec"]), Paragraph("Arquivo:linha", E["cabec"]), Paragraph("Descrição", E["cabec"])]]
        for a in lista:
            local = "<br/>".join(esc(x) for x in a["local"])
            issue = f" <font color='#475569'>(issue {a['issue']})</font>" if a["issue"] else ""
            linhas.append([chip(a["sev"]), Paragraph(local, E["celula_mono"]),
                           Paragraph(f"<b>{a['id']} · {esc(a['titulo'])}</b>{issue}<br/>{esc(a['desc'])}", E["celula"])])
        bloco.append(tabela(linhas, larguras))
        if cod == "FE":
            bloco.insert(1, Paragraph("Encontrados durante a leitura completa do código; não pertencem às cinco "
                                      "categorias pedidas, mas são acionáveis.", E["pequeno"]))
        itens += bloco
    itens.append(CondPageBreak(9 * cm))
    itens.append(Paragraph("Cobertura das rotas (C2 e C3)", E["h2"]))
    itens.append(Paragraph("Todas as rotas da API em src/index.js e o controle que o servidor aplica em cada uma.", E["pequeno"]))
    itens.append(Spacer(1, 0.15 * cm))
    linhas = [[Paragraph("Rota", E["cabec"]), Paragraph("Controle no servidor", E["cabec"]), Paragraph("Linhas", E["cabec"])]]
    linhas += [[Paragraph(esc(r), E["celula_mono"]), Paragraph(esc(c), E["celula"]), Paragraph(esc(l), E["celula_mono"])] for r, c, l in COBERTURA]
    itens.append(tabela(linhas, [6.4 * cm, LARGURA - 9.4 * cm, 3.0 * cm]))
    return itens


def recomendacoes():
    itens = [PageBreak(), Paragraph("4. Recomendações priorizadas", E["h1"])]
    cores = {"P1": SEV["média"], "P2": SEV["baixa"], "P3": SEV["baixa"], "P4": SEV["baixa"], "P5": FORTE}
    for cod, titulo, texto in RECOMENDACOES:
        marca = Table([[Paragraph(cod, E["chip"])]], colWidths=[1.1 * cm], rowHeights=[0.55 * cm])
        marca.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(cores[cod])), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                   ("ROUNDEDCORNERS", [5, 5, 5, 5]), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
        linha = Table([[marca, [Paragraph(esc(titulo), E["h3"]), Paragraph(esc(texto), E["p"])]]],
                      colWidths=[1.5 * cm, LARGURA - 1.5 * cm])
        linha.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                   ("TOPPADDING", (0, 0), (0, 0), 9), ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINHA)]))
        itens += [KeepTogether([linha]), Spacer(1, 0.15 * cm)]
    return itens


def issues():
    itens = [PageBreak(), Paragraph("5. ISSUES PARA O GITHUB", E["h1"]),
             Paragraph("Um bloco por achado acionável, pronto para copiar e colar. A primeira linha de cada bloco é o "
                       "título e a segunda, as labels sugeridas; o restante é o corpo em Markdown. A6 foi agrupado com "
                       "A2 (mesmo tema: FormSubmit). A3, A4 e A5 são informativos e não geram issue.", E["p"])]
    markdown = []
    for n, titulo, labels, corpo in ISSUES:
        texto = f"--- ISSUE {n} ---\nTítulo: {titulo}\nLabels: {labels}\n\n{desembrulhar(corpo).rstrip()}\n--- FIM ISSUE {n} ---"
        markdown.append(texto)
        itens += [CondPageBreak(5 * cm), Spacer(1, 0.25 * cm), BlocoCodigo(quebrar(texto))]
    # Cópia fiel em texto (copiar do PDF sempre traz as quebras de linha da página).
    with open(os.path.join(AQUI, "issues-github.md"), "w", encoding="utf-8") as arquivo:
        arquivo.write(f"# Issues para o GitHub — {TITULO}\n\n" + "\n\n".join(markdown) + "\n")
    return itens


def main():
    doc = BaseDocTemplate(SAIDA, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
                          title=TITULO, author="Auditoria de segurança", subject="Auditoria de segurança da Plannex", lang="pt-BR")
    quadro_capa = Frame(2 * cm, 2 * cm, A4[0] - 4 * cm, A4[1] - 4 * cm, id="capa")
    quadro = Frame(2 * cm, 2 * cm, A4[0] - 4 * cm, A4[1] - 4 * cm, id="normal")
    doc.addPageTemplates([PageTemplate("capa", [quadro_capa], onPage=pagina_capa),
                          PageTemplate("normal", [quadro], onPage=pagina_normal)])
    historia = capa() + resumo() + fortes_fracos() + achados() + recomendacoes() + issues()
    doc.build(historia)
    print(SAIDA)


if __name__ == "__main__":
    main()
