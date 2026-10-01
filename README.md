# 📊 Plannex

Site da **Plannex**, com duas frentes de serviço:

- **Cálculos judiciais e financeiros**, feitos por economistas: atualização monetária, juros, apuração e liquidação, conferência e contestação. A entrega é a memória de cálculo em Excel e o parecer técnico assinado.
- **Automação de planilhas** no Excel e no Office: planilhas sob medida, relatórios, macros, botões e VBA, gráficos e painéis.

**[Abrir site →](https://misty-king-c67fe.luh20123.workers.dev/)**

## O que tem no site

| Seção | O que mostra |
| --- | --- |
| Início | Serviços de cálculo, formas de contratação (cálculo simples e personalizado) e o passo a passo do atendimento |
| Laboratório Plannex | Demonstração animada de uma memória de cálculo indo dos documentos ao parecer, com dados fictícios |
| Exemplo de memória | Tabela ilustrativa com competência, fator, valor corrigido, juros e total |
| Serviço de Automação | Planos de automação, a demonstração "da bagunça ao controle" e a lista do que pode ser automatizado |
| Contato | Formulário que envia por e-mail (FormSubmit) ou abre o WhatsApp com a mensagem pronta |
| Painel interno (`/painel/`) | Só com login: caixa de entrada dos contatos e andamento de cada pedido por etapas |

Os exemplos de cálculo e de planilha usam valores fictícios.

## Painel interno

Cada envio do formulário continua indo por e-mail e também cai na **caixa de entrada** do painel, com o serviço (cálculo ou automação), o nome e a data. Daí o contato é movido pelo **andamento**:

```
Pedido → Nota emitida → Pagamento efetuado → Processo iniciado → Revisado → Concluído → Entregue
```

O painel guarda quem moveu cada contato e quando. Os contatos podem ser filtrados por serviço e buscados pelo nome. Spam se exclui pelo histórico.

- **Login:** usuário e senha. Senhas guardadas com PBKDF2 (100 mil iterações, sal próprio). Sessão por cookie `HttpOnly`, `Secure` e `SameSite=Strict`, válida por 7 dias. Depois de 5 erros em 15 minutos, o login trava.
- **Formulário:** no máximo 5 envios a cada 10 minutos por visitante, com o campo anti-robô do site. O IP não é guardado, só um hash dele para contar tentativas.
- **Dados guardados:** serviço, nome e data. WhatsApp, e-mail, descrição e anexos ficam só no e-mail.

## Arquivos

```
public/                     tudo que o site publica
  index.html                página única, navegação por âncoras (#inicio, #automacao, #contato)
  _headers                  cabeçalhos de segurança e cache
  assets/css, assets/img    estilos, logo, ícones e imagem de compartilhamento
  assets/js/script.revNNN.js        navegação, animações, demonstrações e envio do formulário por e-mail
  assets/js/calculos-ui.revNNN.js   demonstração do laboratório de cálculo
  assets/js/registro-contato.revNNN.js  registra cada envio do formulário no painel
  painel/                   painel interno (HTML, CSS e JS)
src/index.js                Worker: serve public/ e responde a API em /api/
src/senha.js                hash de senha (PBKDF2), usado pelo Worker e pelas ferramentas
migrations/                 tabelas do banco D1
tools/criar-usuario.mjs     cria usuário do painel ou troca a senha
tools/servidor-local.mjs    prévia local sem o workerd
wrangler.jsonc              configuração do Worker, do banco e da limpeza diária
```

O número `revNNN` no nome dos arquivos é o controle de cache: a cada versão nova o arquivo muda de nome, então o navegador nunca usa um CSS ou JS antigo. O `_headers` guarda esses arquivos em cache por um ano e sempre revalida o `index.html` e o painel.

> Ao trocar o site por uma versão nova, mantenha em `public/index.html` a linha `<script src="./assets/js/registro-contato.rev140.js"></script>` e as regras do painel no `_headers`. Sem ela, os contatos param de chegar ao painel (o e-mail continua).

## Como rodar no computador

Precisa do Node.js 22 ou mais novo.

```bash
npm install
PLANNEX_SENHA="uma-senha-de-teste" node tools/servidor-local.mjs --usuario teste "Usuário de Teste"
node tools/servidor-local.mjs
```

O site abre em http://localhost:5330 e o painel em http://localhost:5330/painel/. A prévia roda o mesmo Worker com o banco num arquivo SQLite local (`.wrangler/previa.sqlite`). O `npm run dev` (wrangler dev) também funciona, mas no Windows exige o Visual C++ Redistributable.

## Primeira publicação

```bash
npx wrangler login
npx wrangler d1 create plannex
```

Copie o `database_id` mostrado para o `wrangler.jsonc` e depois:

```bash
npm run db:migrar
npm run usuario -- fulano "Nome do Fulano"
npm run deploy
```

O `npm run usuario` pede a senha no terminal sem mostrá-la. Rodar de novo com o mesmo usuário troca a senha e encerra as sessões abertas dele. Cada pessoa também pode trocar a própria senha pelo painel.

## Configuração do contato

No início de `public/assets/js/script.revNNN.js`:

- `WHATSAPP_NUMBER`: 55 + DDD + número, só dígitos.
- `FORM_SUBMIT_ENDPOINT`: endereço do FormSubmit com o e-mail que recebe os pedidos.

## Segurança

A página só carrega arquivos do próprio site. A Content-Security-Policy libera, fora isso, apenas o envio ao FormSubmit; não há scripts, fontes ou rastreadores de terceiros. O painel não aparece em buscadores (`noindex`) e toda escrita na API precisa vir do próprio site.
