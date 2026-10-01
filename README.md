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
| Central (`/painel/`) | Só com login: contatos, pedidos, prazos e pagamentos da equipe |

Os exemplos de cálculo e de planilha usam valores fictícios.

## Central Plannex (painel interno)

Cada envio do formulário continua indo por e-mail, com os anexos, e também cai na Central com a ficha completa. A Central tem seis telas:

| Tela | O que faz |
| --- | --- |
| **Visão geral** | Saudação com o resumo do dia, números (novos na semana, em andamento, recebido e entregues no mês), contatos por semana, divisão por serviço com taxa de conversão, funil por etapa, o que precisa de atenção (prazos vencendo, contatos esperando resposta, pagamentos pendentes, pedidos parados) e atividade recente da equipe |
| **Caixa de entrada** | Todos os contatos agrupados por data, com prévia do pedido, filtros (aguardando, não lidos, serviço, texto), atalho para o WhatsApp e exportação para Excel |
| **Andamento** | Quadro com as etapas Pedido → Nota emitida → Pagamento efetuado → Processo iniciado → Revisado → Concluído → Entregue. Cartões com valor, nota, prazo e responsável; arrastar, setas ou teclado |
| **Agenda** | Calendário do mês com prazos de entrega e pagamentos recebidos, e a lista dos próximos 14 dias |
| **Arquivo** | Contatos que não seguiram adiante, sem apagar nada |
| **Equipe** | Quem acessa, novos acessos, senha provisória e troca da própria senha |

A **ficha do contato** abre de qualquer tela. Ela tem:

- **Andamento:** a trilha das etapas, onde um clique move o contato.
- **Atalhos:** WhatsApp com mensagem pronta e resposta por e-mail.
- **Dados:** os dados do formulário e os do negócio (responsável, valor, número da nota, data do pagamento e prazo de entrega).
- **Linha do tempo:** anotações da equipe e o registro automático de cada mudança, com autor e horário.

Ao chegar em "Pagamento efetuado", a data do pagamento é preenchida sozinha. Contatos que chegam por WhatsApp, telefone ou indicação entram pelo botão **Novo contato** (atalho `N`). A busca no topo (atalho `/`) acha qualquer contato pelo nome, e-mail, telefone ou texto.

A Central se atualiza sozinha a cada 45 segundos, avisa quando chega contato novo e mostra no título da aba quantos ainda não foram lidos. Mover um contato de etapa pode ser desfeito pelo aviso que aparece.

### Segurança e dados

- **Login:** usuário e senha. Senhas guardadas com PBKDF2 (100 mil iterações, sal próprio). Sessão por cookie `HttpOnly`, `Secure` e `SameSite=Strict`, válida por 7 dias. Depois de 5 erros em 15 minutos, o login trava.
- **Formulário:** no máximo 5 envios a cada 10 minutos por visitante, com o campo anti-robô do site. O IP não é guardado, só um hash dele para contar tentativas.
- **Dados guardados:** os campos de texto do formulário (nome, WhatsApp, e-mail, plano, descrição e observações). Anexos ficam só no e-mail. Os dados de contato são pessoais: só a equipe com login vê, e o contato pode ser excluído a pedido da pessoa.
- **Equipe:** qualquer pessoa da equipe pode dar e remover acessos. Ninguém remove o próprio acesso, e a Central sempre fica com pelo menos um usuário.

## Arquivos

```
public/                     tudo que o site publica
  index.html                página única, navegação por âncoras (#inicio, #automacao, #contato)
  _headers                  cabeçalhos de segurança e cache
  assets/css, assets/img    estilos, logo, ícones e imagem de compartilhamento
  assets/js/script.revNNN.js        navegação, animações, demonstrações e envio do formulário por e-mail
  assets/js/calculos-ui.revNNN.js   demonstração do laboratório de cálculo
  assets/js/registro-contato.revNNN.js  registra cada envio do formulário no painel
  painel/                   Central: index.html, central.css e js/ (uma tela por arquivo)
src/index.js                Worker: serve public/ e responde a API em /api/
src/senha.js                hash de senha (PBKDF2), usado pelo Worker e pelas ferramentas
migrations/                 tabelas do banco D1
tools/criar-usuario.mjs     cria usuário do painel ou troca a senha
tools/servidor-local.mjs    prévia local sem o workerd
wrangler.jsonc              configuração do Worker, do banco e da limpeza diária
```

O número `revNNN` no nome dos arquivos é o controle de cache: a cada versão nova o arquivo muda de nome, então o navegador nunca usa um CSS ou JS antigo. O `_headers` guarda esses arquivos em cache por um ano e sempre revalida o `index.html` e o painel.

> Ao trocar o site por uma versão nova, mantenha em `public/index.html` a linha `<script src="./assets/js/registro-contato.rev141.js"></script>` e as regras do painel no `_headers`. Sem ela, os contatos param de chegar ao painel (o e-mail continua).

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

O `npm run usuario` pede a senha no terminal sem mostrá-la. Rodar de novo com o mesmo usuário troca a senha e encerra as sessões abertas dele. Depois do primeiro acesso, os outros podem ser criados pela tela Equipe.

> O build pelo GitHub não aplica migrações do banco. Quando houver um arquivo novo em `migrations/`, rode `npm run db:migrar` antes do push.

## Configuração do contato

No início de `public/assets/js/script.revNNN.js`:

- `WHATSAPP_NUMBER`: 55 + DDD + número, só dígitos.
- `FORM_SUBMIT_ENDPOINT`: endereço do FormSubmit com o e-mail que recebe os pedidos.

## Segurança

A página só carrega arquivos do próprio site. A Content-Security-Policy libera, fora isso, apenas o envio ao FormSubmit; não há scripts, fontes ou rastreadores de terceiros. O painel não aparece em buscadores (`noindex`) e toda escrita na API precisa vir do próprio site.
