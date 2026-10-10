# Issues para o GitHub — Relatório de Auditoria de Segurança — Plannex

--- ISSUE 1 ---
Título: [Segurança] Formulário público descarta o pedido de outra pessoa com o mesmo nome e devolve o protocolo dela
Labels: security, severidade: média

## Descrição
A deduplicação do `POST /api/contato` trata como "repetido" qualquer pedido com o **mesmo serviço e o mesmo nome** recebido nos últimos 10 minutos, sem comparar e-mail, telefone ou texto. Duas pessoas diferentes com nome comum (ex.: "Maria Souza") colidem: a segunda recebe `ok: true`, `repetido: true` e o **protocolo da primeira**, nada é gravado na Central e o navegador também **deixa de enviar o e-mail** do FormSubmit. O pedido some sem rastro.

É explorável de dois jeitos: por acaso (nomes comuns no mesmo serviço) ou de propósito, por quem envia um pedido com o nome de outra pessoa logo antes dela, fazendo o pedido real ser descartado.

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
Reprodução (harness dos testes): duas "Maria Souza" com e-mails, telefones e descrições diferentes -> a segunda recebeu `{"ok":true,"repetido":true,"protocolo":"PLX-2026-0001"}` e o banco ficou com um único contato.

## Impacto
Perda silenciosa de pedidos de clientes (sem registro na Central e sem e-mail) e exposição do protocolo de outra pessoa ao solicitante.

## Sugestão de correção
- Remover a regra por `servico + nome`; manter só `pedidoRepetido` (e-mail **ou** telefone + mesma descrição), ou comparar um hash de todos os campos enviados.
- Não devolver o protocolo de outro registro: no caso repetido, responder só `ok: true, repetido: true`.
- Na dúvida, gravar o contato e deixar a triagem para a caixa de entrada.

## Critérios de aceite
- [ ] Dois envios com mesmo nome e serviço, mas e-mail/telefone ou texto diferentes, geram dois contatos.
- [ ] Reenvio idêntico (clique duplo) continua sem duplicar.
- [ ] A resposta de um envio repetido não traz o protocolo de outro registro.
- [ ] Teste automatizado cobrindo os três casos acima.
--- FIM ISSUE 1 ---

--- ISSUE 2 ---
Título: [Segurança] Qualquer pessoa consegue travar o login de um usuário por 15 minutos
Labels: security, severidade: baixa

## Descrição
O limite de tentativas de login conta falhas por **usuário**, vindas de qualquer IP. Quem souber um login (ex.: o do administrador) erra a senha 5 vezes e a conta fica bloqueada por 15 minutos, inclusive para o dono com a senha certa. Repetindo a cada 15 minutos, o bloqueio é permanente.

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
--- FIM ISSUE 2 ---

--- ISSUE 3 ---
Título: [Segurança] Limite de 32 KB do corpo JSON pode ser contornado sem Content-Length
Labels: security, severidade: baixa

## Descrição
`lerJson()` só recusa corpos grandes quando o cabeçalho `Content-Length` existe. Enviando o corpo em stream (chunked, sem `Content-Length`), `request.json()` lê tudo. O mesmo helper atende o `POST /api/contato`, que é público (a checagem de `Origin` não impede chamadas fora do navegador).

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
- Ler `request.body` com um contador de bytes e abortar ao passar de 32 KB, ou recusar escritas sem `Content-Length`.

## Critérios de aceite
- [ ] Corpo de mais de 32 KB é recusado com e sem `Content-Length`.
- [ ] Teste automatizado com corpo em stream.
--- FIM ISSUE 3 ---

--- ISSUE 4 ---
Título: [Segurança] Endpoint do FormSubmit com e-mail real, sem captcha, e e-mail montado por terceiro
Labels: security, severidade: baixa

## Descrição
O formulário do site usa o endereço real `contato@plannex.online` como endpoint do FormSubmit e envia `_captcha=false`. Esse endereço funciona como credencial de envio: qualquer pessoa pode disparar e-mails para a caixa da Plannex direto no FormSubmit, sem passar pelo limite de envios da Central (5 a cada 10 minutos por IP). Além disso, nome e campos livres do cliente entram no assunto e no corpo de um e-mail montado pelo FormSubmit (template "table"), cujo escape de HTML está fora do controle do projeto.

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
Spam e e-mails falsos de "nova solicitação" na caixa da empresa (inclusive imitando pedidos reais) e dependência de um terceiro para escapar o conteúdo enviado pelo cliente.

## Sugestão de correção
- Trocar o endereço pelo alias aleatório que o FormSubmit oferece e ativar o captcha; ou
- Preferível: enviar o e-mail pelo próprio Worker, depois do limite por IP, com um serviço transacional e template com escape.

## Critérios de aceite
- [ ] O endereço real não aparece no HTML nem no JavaScript do site.
- [ ] Envios automatizados direto ao endpoint de e-mail são barrados (captcha ou limite no servidor).
- [ ] Dados do cliente no e-mail passam por escape controlado pelo projeto (se o envio sair do Worker).
--- FIM ISSUE 4 ---
