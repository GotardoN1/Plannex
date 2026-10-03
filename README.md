# 📊 Plannex

Site da **Plannex**, com duas frentes de serviço:

- **Cálculos judiciais e financeiros**, feitos por economistas, em qualquer fase do processo (cálculo inicial, de sentença e final): atualização monetária, juros, apuração e liquidação, conferência e impugnação. A entrega é a memória de cálculo e o parecer técnico.
- **Automação de planilhas** no Excel e no Office: planilhas sob medida, relatórios, macros, botões e VBA, gráficos e painéis.

**[Abrir site →](https://misty-king-c67fe.luh20123.workers.dev/)** · **[Demonstração da Central →](https://plannex-demo.luh20123.workers.dev/painel/)** (dados fictícios, sem senha)

## O que tem no site

| Seção | O que mostra |
| --- | --- |
| Início | Serviços de cálculo, fases do processo, a lista de cálculos que atendemos, formas de contratação (cálculo simples, pacote de 10 cálculos e personalizado) e o passo a passo do atendimento |
| Laboratório Plannex | Demonstração animada de uma memória de cálculo indo dos documentos ao parecer, com dados fictícios |
| Serviço de Automação | Planos de automação, a demonstração "da bagunça ao controle" e a lista do que pode ser automatizado |
| Contato | Formulário que envia por e-mail (FormSubmit) ou abre o WhatsApp com a mensagem pronta; planos de cálculo e de automação, inclusive os personalizados (sob orçamento) |
| Aparência | Pílula no canto inferior esquerdo: modo noturno (claro/escuro) e visual Simples ou Sofisticado (o original do site). A escolha fica no navegador e vale também na Central |
| Central (`/painel/`) | Só com login: contatos, pedidos, prazos e pagamentos da equipe |

Os exemplos de cálculo e de planilha usam valores fictícios. O visual segue o da Central (`assets/css/simples.rev1.css`, carregado depois do CSS do site): cartões lisos, sem degradês nem brilhos, mesmas fontes e botões.

## Central Plannex (painel interno)

Cada envio do formulário continua indo por e-mail, com os anexos, e também cai na Central com a ficha completa. A Central tem estas telas:

| Tela | O que faz |
| --- | --- |
| **Visão geral** | Saudação (com o apelido), números (novos na semana, em andamento, recebido e entregues no mês; se o mês ainda não tem pagamento ou entrega, mostra o último mês que teve), contatos por mês (só os meses com contato ou venda), divisão por serviço com taxa de conversão, funil por etapa, o que precisa de atenção (prazos vencendo, contatos esperando resposta, pagamentos pendentes, pedidos parados) e atividade recente da equipe |
| **Caixa de entrada** | Os contatos em aberto agrupados por data, com prévia do pedido, a etiqueta do serviço e as **etiquetas pessoais** (botão "+", texto e cor; cada pessoa vê só as suas), filtros (aguardando, não lidos, serviço, texto) e exportação para Excel. Cada linha tem colunas fixas: "Mover para…" (administrador, qualquer etapa, para frente ou para trás), etapa, WhatsApp, responsável e o **botão azul de avançar**, que muda conforme a etapa (Aceitar pedido → Notas e ordens → Iniciar processo → Enviar para revisão → Entregar) |
| **Concluídos** | Tudo o que chegou em Entregue, fora do quadro para ele não lotar; colunas fixas de conclusão, responsável e valor; filtros por responsável e serviço. O administrador pode **reabrir** (volta ao Andamento). Para o funcionário, só os dele, para consulta |
| **Andamento** | Quadro só com o que está em trabalho: Pedido → Notas e ordens → Processo iniciado → Revisado pelo cliente. Na última coluna, "Concluir" leva para Concluídos. Cartões compactos na cor do serviço (laranja: cálculos, azul: automação): nome e valor na primeira linha, depois serviço, nota e prazo, e no rodapé responsável e anexos; filtros por serviço e responsável; arrastar, setas ou teclado |
| **Agenda** | Calendário do mês com prazos de entrega e pagamentos recebidos, e a lista dos próximos 14 dias |
| **Arquivo** | Contatos que não seguiram adiante, sem apagar nada |
| **Materiais** | Arquivos de uso frequente da equipe (moldes, planilhas de demonstração, PDFs), com tamanho, data de envio/atualização, quem enviou e descrição. Todos baixam; o administrador envia, troca e exclui. Espaço de 100 MB |
| **Equipe** | Quem acessa, nome completo, usuário de login e equipe/área (T.I., economista, advogado...) — só o administrador altera —, tipo de acesso, novos acessos, senha provisória e a carga da equipe (em andamento, atrasadas e entregues no mês por pessoa) |
| **Preferências** | Apelido, modo noturno (claro ou escuro, salvo na conta), visual simples ou o do site (neste navegador) e redefinição da própria senha. O botão de tema também fica fixo ao lado da busca |

A **ficha do contato** abre de qualquer tela e é organizada em **abas, uma por etapa**. Clicar numa aba só mostra o conteúdo dela; mudar de etapa é pelo botão de ação, sempre com confirmação. O administrador também tem **"Voltar para…"**, uma etapa por vez, e numa demanda entregue **"Reabrir"**.

| Aba | Conteúdo |
| --- | --- |
| Caixa de entrada (junta a chegada e o Pedido) | Contato, entrega (responsável e prazo), **Solicitação** e comentários |
| Notas e ordens | Só administrador (em vermelho e trancada para o funcionário): valor, nota fiscal, pagamento (com o botão **Hoje**), **molde em branco da ordem de serviço** para baixar ("Trocar" envia outro, em PDF ou Word) e um envio único para notas fiscais e ordens de serviço, sem escolher tipo |
| Processo iniciado | **Solicitação**, com envio de mais documentos do cliente, e anotações do processo |
| Revisado pelo cliente | O que o cliente pediu para ajustar |
| Entregue | Excel e relatório finais, molde em branco do relatório, comentário da entrega e o registro de quando e quem entregou (o administrador pode corrigir o dia) |

Para concluir, o funcionário sobe os arquivos finais na aba Entregue e clica em "Concluir e registrar entrega"; o dia e a hora ficam registrados. No fim da ficha fica o histórico completo (movimentações, anexos e alterações).

A **Solicitação** repete o formulário do site, na mesma ordem: serviço, plano de interesse, necessidade, atividade manual, o que deve permanecer inalterado, anexo do cliente (a resposta e os arquivos) e observações adicionais. Campos vazios não aparecem. Os arquivos aparecem com uma miniatura do tipo (PDF, DOC, XLS, IMG).

O administrador tem o botão **Gerar OS** no topo da ficha: baixa a Ordem de Serviço oficial da Plannex (PDF editável em `public/painel/modelos/`) já preenchida com protocolo, cliente, demanda, documentos recebidos, entregáveis, valor, prazo e etapa. O resto se completa no próprio PDF e o cliente assina. O preenchimento roda no navegador com a [pdf-lib](https://pdf-lib.js.org/) (MIT, em `public/painel/vendor/`).

Contatos que chegam por WhatsApp, telefone ou indicação entram pelo botão **Novo contato** (atalho `N`). A busca no topo (atalho `/`) acha qualquer contato pelo nome, e-mail, telefone ou texto.

Toda mudança de etapa pede confirmação (de qual etapa para qual), seja pela seta, pela ficha, pela trilha ou arrastando. A Central se atualiza sozinha a cada 45 segundos, avisa quando chega contato novo e mostra no título da aba quantos ainda não foram lidos. Mover um contato de etapa pode ser desfeito pelo aviso que aparece.

### Acessos

| | Administrador | Funcionário |
| --- | --- | --- |
| Telas | Todas | Minhas demandas, Agenda e Concluídos |
| Contatos | Todos | Só os que tem como responsável |
| Valor, nota fiscal, pagamento | Vê e edita | Não vê (nem na linha do tempo) |
| Notas fiscais e ordens de serviço | Vê e anexa | Não vê (mostram quanto a casa cobra) |
| Documentos do cliente e arquivos da entrega | Vê e anexa | Vê e anexa |
| Etapas | Todas, para frente e para trás ("Mover para…", "Voltar para…", "Reabrir") | Avança pelo botão azul: Iniciar processo → Enviar para revisão → Entregar; não entra em Pedido nem Notas e ordens |
| Anotações | Sim | Sim, até concluir |
| Arquivar, excluir, cadastrar, equipe | Sim | Não |

Quando o funcionário conclui (chega em Entregue), a demanda sai de "Minhas demandas" e vai para **Concluídos**, só para consulta. Ele pode desfazer o próprio movimento por 10 minutos (inclusive um "Iniciar processo" feito por engano); depois, só um administrador reabre ou volta etapas.

A regra vale na API: um funcionário não consegue buscar o que não vê na tela.

### Segurança e dados

- **Login:** usuário e senha. Senhas guardadas com PBKDF2 (100 mil iterações, sal próprio). Sessão por cookie `HttpOnly`, `Secure` e `SameSite=Strict`, válida por 7 dias. Depois de 5 erros em 15 minutos, o login trava.
- **Formulário:** no máximo 5 envios a cada 10 minutos por visitante, com o campo anti-robô do site. O IP não é guardado, só um hash dele para contar tentativas.
- **Dados guardados:** os campos do formulário (nome, WhatsApp, e-mail, plano, descrição e observações) e os documentos anexados (até 10 arquivos e 10 MB; só PDF, imagem, Excel, Word, CSV e texto). Se o armazenamento passar de 800 MB, os documentos novos ficam só no e-mail e a ficha avisa. Os dados de contato são pessoais: só a equipe com login vê, e o contato pode ser excluído a pedido da pessoa.
- **Equipe:** só administradores dão, mudam e removem acessos. Ninguém muda ou remove o próprio acesso, então sempre sobra um administrador.
- **Anexos:** sempre baixados como arquivo, nunca abertos como página do site.

## Demonstração

Em **https://plannex-demo.luh20123.workers.dev/painel/** fica uma cópia da Central com dados fictícios, como a demonstração da intranet:

- Escolha de perfil sem senha: duas pessoas administradoras e três funcionárias, cada uma com uma dica do que mostra, e um roteiro sugerido.
- Faixa amarela no topo para trocar de perfil, reiniciar os dados ou voltar à escolha.
- Os dados voltam ao exemplo toda madrugada (03h) e pelo botão "Reiniciar dados". As datas são relativas ao dia, então a demonstração nunca parece velha.
- É outro Worker (`plannex-demo`), com banco e arquivos próprios. A Central real não tem as rotas de demonstração: elas só existem com `DEMO=true`.
- Na demonstração, a página inicial do site leva direto à Central, para ninguém mandar e-mail de verdade pelo formulário. Anexos ficam limitados a 1 MB e 40 envios por dia, para não gastar a cota grátis da conta.

Para publicar uma versão nova da demonstração: `npm run deploy:demo`. Para ver no computador: `PLANNEX_DEMO=1 PORT=5331 node tools/servidor-local.mjs`.

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
src/demo.js                 perfis e dados fictícios da demonstração
migrations/                 tabelas do banco D1
tools/criar-usuario.mjs     cria usuário do painel ou troca a senha
tools/servidor-local.mjs    prévia local sem o workerd
wrangler.jsonc              configuração do Worker, do banco e da limpeza diária
```

O número `revNNN` no nome dos arquivos é o controle de cache: a cada versão nova o arquivo muda de nome, então o navegador nunca usa um CSS ou JS antigo. O `_headers` guarda esses arquivos em cache por um ano e sempre revalida o `index.html` e o painel.

> Ao trocar o site por uma versão nova, mantenha em `public/index.html` a linha `<script src="./assets/js/registro-contato.rev142.js"></script>` e as regras do painel no `_headers`. Sem ela, os contatos param de chegar ao painel (o e-mail continua).

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
