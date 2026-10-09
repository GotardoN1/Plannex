# 📊 Plannex

Site da **Plannex**, com duas frentes de serviço:

- **Cálculos judiciais e financeiros**, feitos por economistas, em qualquer fase do processo (cálculo inicial, de sentença e final): atualização monetária, juros, apuração e liquidação, conferência e impugnação. A entrega é a memória de cálculo e o parecer técnico.
- **Automação de planilhas** no Excel e no Office: planilhas sob medida, relatórios, macros, botões e VBA, gráficos e painéis.

**[Abrir site →](https://misty-king-c67fe.luh20123.workers.dev/)** · **[Demonstração da Central →](https://plannex-demo.luh20123.workers.dev/painel/)** (dados fictícios, sem senha)

## O que tem no site

| Seção | O que mostra |
| --- | --- |
| Início | Serviços de cálculo, fases do processo, a lista de cálculos que atendemos, formas de contratação (Cálculo Geral, R$ 199,90, para até 1 credor, e Cálculo Personalizado, com valor após análise) e o passo a passo do atendimento. No celular, "Do cálculo pontual…" e "Do pedido inicial…" ficam recolhidas lá embaixo, junto das demais, antes de "Ver detalhes da entrega técnica" |
| Laboratório Plannex | Demonstração animada de uma memória de cálculo indo dos documentos ao parecer, com dados fictícios |
| Serviço de Automação | Planos de automação, a demonstração "da bagunça ao controle" e a lista do que pode ser automatizado |
| Contato | Formulário que envia por e-mail (FormSubmit) ou abre o WhatsApp com a mensagem pronta; planos de cálculo e de automação, inclusive os personalizados (sob orçamento). Pede CPF ou CNPJ (com conferência dos dígitos) ao lado do e-mail e aceita o WhatsApp com ou sem +55. O anexo começa em "Enviar depois"; quem escolhe "Sim, anexar" precisa subir pelo menos um arquivo. Depois do envio, uma caixa avisa "Pedido efetuado com sucesso! Entraremos em contato após a análise da solicitação.", com o número da solicitação bem pequeno no pé (é referência da equipe, não para o cliente acompanhar) |
| Privacidade e Termos | `privacidade.html`, no rodapé: Política de Privacidade (LGPD) e Termos de Uso |
| WhatsApp flutuante | Pílula verde fixa no canto inferior direito, sem animação, logo acima da pílula de aparência (modo claro/escuro e visual Simples/Sofisticado), com a mesma largura |
| Aparência | Pílula no canto inferior esquerdo: modo noturno (claro/escuro) e visual Simples ou Sofisticado (o original do site). A escolha fica no navegador e vale também na Central |
| Central (`/painel/`) | Só com login: contatos, pedidos, prazos e pagamentos da equipe |

Os exemplos de cálculo e de planilha usam valores fictícios. O visual segue o da Central (`assets/css/simples.rev11.css`, carregado depois do CSS do site): cartões lisos, sem degradês nem brilhos, mesmas fontes e botões. As seções em faixas, o visual de referência e a largura em telas largas ficam em `assets/css/secoes.rev6.css`, que vale nos dois visuais (Simples e Sofisticado).

## Central Plannex (painel interno)

Cada envio do formulário continua indo por e-mail, com os anexos, e também cai na Central com a ficha completa. A Central tem estas telas:

| Tela | O que faz |
| --- | --- |
| **Visão geral** | Saudação (com o apelido), números (novos na semana, em andamento, recebido e entregues no mês; se o mês ainda não tem pagamento ou entrega, mostra o último mês que teve), contatos por mês (só os meses com contato ou venda), divisão por serviço com taxa de conversão, funil por etapa, o que precisa de atenção (prazos vencendo, contatos esperando resposta, pagamentos pendentes, pedidos parados) e atividade recente da equipe |
| **Caixa de entrada** | Só os pedidos novos, agrupados por data, com prévia, etiquetas e os botões **Recusar** (vai para Recusados, guardando o lead) e **Aceitar** (vai para o Andamento, em Notas e ordens). Para o funcionário, a caixa traz as dele em Pedido e Retificação, com um botão por vez: **Iniciar pedido** → **Entregar** (ou **Entregar nova versão**, se voltou da Retificação) |
| **Concluídos** | Tudo o que chegou em Entregue, fora do quadro para ele não lotar; colunas fixas de conclusão, responsável e valor; filtros por responsável e serviço. O administrador pode **reabrir** (volta ao Andamento). Para o funcionário, só os dele, para consulta |
| **Andamento** | Quadro com as etapas em trabalho: **1. Notas e ordens** (administrador: cobrança, nota, OS, assinatura e prazo) → **2. Pedido** (passa só escolhendo quem da equipe vai cuidar; o cartão mostra se o funcionário já iniciou) → **4. Conclusão** (o funcionário entregou; o administrador fala com o cliente e **aprova**, indo para Concluídos, ou **reprova**). Reprovada, a demanda vai para **3. Retificação**, em vermelho, com o que o cliente pediu para ajustar, e volta ao funcionário, que sobe a nova versão e entrega de novo, quantas vezes precisar. O concluído vai para Concluídos; para o funcionário, a demanda entra em Concluídos já ao entregar. Cartões na cor do serviço, filtros, arrastar ou setas |
| **Recusados** | Pedidos recusados, guardados com o contato para retomar: Devolver para a caixa ou Aceitar |
| **Agenda** | Calendário do mês com prazos de entrega e pagamentos recebidos, e a lista dos próximos 14 dias |
| **Arquivados** | Contatos que não seguiram adiante, sem apagar nada |
| **Financeiro** | Só administradores. No topo, a empresa (nome fantasia, razão social, CNPJ) e a divisão do que entra em barra colorida (Parte da Plannex e os dois sócios), editáveis em "Editar dados e divisão". Depois: vencimentos em vermelho/amarelo (o resumo mostra o mês atual ou, sem recebimento nele ainda, o último mês com faturamento), resumo do mês (recebido, Parte da Plannex, caixa da Plannex, a receber), saúde da empresa, o próximo pagamento dos sócios no 5º dia útil (no pagamento, sábado conta como dia útil), o recebido por mês em barras e as despesas agrupadas por ano e mês, com renovação. Por último, o pagamento da equipe: escolhendo o funcionário e o mês de faturamento, as demandas concluídas e pagas dele, quanto ele recebe (percentual da equipe, em "Editar dados e divisão") e quanto vai para a Plannex; a parte da equipe sai antes da divisão entre Plannex e sócios. O administrador recebe o aviso dos vencimentos ao entrar |
| **Materiais** | Arquivos de uso frequente da equipe (moldes, planilhas de demonstração, PDFs), com tamanho, data de envio/atualização, quem enviou e descrição. O administrador envia, troca, exclui e escolhe quem vê cada arquivo (toda a equipe ou só administradores). Espaço de 100 MB |
| **Equipe** | Quem acessa, nome completo, usuário de login e equipe/área (T.I., economista, advogado...) — só o administrador altera —, tipo de acesso, novos acessos, senha provisória e a carga da equipe (em andamento, atrasadas e entregues no mês por pessoa) |
| **Preferências** | Apelido, modo noturno (claro ou escuro, salvo na conta), visual Simples ou Sofisticado (neste navegador) e redefinição da própria senha. O botão de tema também fica fixo ao lado da busca |

A **ficha do contato** abre de qualquer tela e é organizada em **abas, uma por etapa**. Clicar numa aba só mostra o conteúdo dela; mudar de etapa é pelo botão de ação, sempre com confirmação. O administrador também tem **"Voltar para…"**, uma etapa por vez, e numa demanda entregue **"Reabrir"**.

| Aba | Conteúdo |
| --- | --- |
| Pedido recebido (antes de aceitar) | Contato, **Solicitação** e comentários, com Aceitar e Recusar no topo |
| 1. Notas e ordens | Só administrador (trancada para o funcionário): contato, valor, nota fiscal, pagamento (com o botão **Hoje**), **prazo de entrega** e um envio único para notas fiscais e ordens de serviço. O **Gerar OS** fica no topo da ficha. Ao aceitar, o prazo já vem preenchido: 3 dias úteis para cálculos e 5 para automações |
| 2. Pedido | Responsável e prazo (o funcionário vê o prazo aqui), **Solicitação** (com envio de mais documentos do cliente) e anotações. O contato do cliente só aparece para o administrador |
| 3. Retificação | Desabilitada até a primeira reprovação. O que o cliente pediu para ajustar e, logo abaixo, o envio da nova versão |
| 4. Entregue | Excel e relatório finais, molde em branco do relatório, comentário da entrega e o registro de quando e quem entregou (o administrador pode corrigir o dia) |

Para entregar, o funcionário clica em **Iniciar pedido**, sobe o arquivo final na aba Entregue (qualquer tipo, menos programas, com mais de 1 KB) e clica em **Entregar**; o dia e a hora ficam registrados. Na Retificação, só entrega de novo com um arquivo enviado depois da reprovação. A API confere as mesmas regras. No fim da ficha fica o histórico completo (movimentações, anexos e alterações).

A **Solicitação** repete o formulário do site, na mesma ordem: serviço, plano de interesse, necessidade, atividade manual, o que deve permanecer inalterado, anexo do cliente (a resposta e os arquivos) e observações adicionais. Campos vazios não aparecem. Os arquivos aparecem com uma miniatura do tipo (PDF, DOC, XLS, IMG).

Cada solicitação ganha um **protocolo** PLX-ANO-NNNN na chegada (pelo site ou pelo Novo contato), contado por ano no horário de Brasília e na ordem de chegada; na virada do ano a contagem recomeça em 0001 e um contato excluído não devolve o número. O número é da equipe: aparece pequeno na confirmação do site e como "Ref." no assunto dos e-mails, mas não no texto das mensagens; aparece também no e-mail do formulário, na lista, nos cartões, na ficha e na OS (tabela `protocolos`, migração 0013).

**Mensagens prontas:** os botões de WhatsApp e e-mail da ficha abrem a conversa com o texto da aba do andamento que está aberta: Pedido recebido (ou recusado), Notas e ordens (aceite, OS e pagamento), Pedido (em execução), Retificação (ajustes) e Entregue (entrega, ou agradecimento se já concluída). Nos Recusados, o WhatsApp já traz a mensagem de recusa. Ao **aceitar** um pedido, a confirmação pergunta por onde avisar o cliente (WhatsApp, e-mail ou agora não, lembrado no navegador) e baixa a OS preenchida para anexar. A chave PIX fica em `public/painel/js/mensagens.js` (`PIX.chave`); enquanto estiver vazia, a mensagem deixa a lacuna para completar.

**Entrega ao cliente:** na aba Entregue, o administrador tem o bloco **Arquivos para o cliente** com o botão **Baixar em ZIP**, que junta os arquivos da versão atual (`PLX-2026-0001_Versao-1.zip`, marcado como "Versão 1"; depois de cada retificação, Versão 2, Versão 3…), montado no navegador (`zip.js`). A mensagem da entrega (pelo botão de WhatsApp ou e-mail do topo) diz que os anexos seguem abaixo, sem citar nome de arquivo, porque eles vão em seguida, em ZIP ou soltos.

O administrador tem o botão **Gerar OS** no topo da ficha: baixa a Ordem de Serviço oficial da Plannex (PDF editável em `public/painel/modelos/`) já preenchida com protocolo, cliente, CPF/CNPJ, plano, demanda, documentos recebidos, escopo e entregáveis assinalados conforme o serviço (automação: planilha/automação, vídeo, guia de uso e ajustes; cálculos: memória de cálculo, parecer técnico, planilha, ajustes/suporte e outro), valor, PIX, prazo estimado (3 dias úteis para cálculos, 5 para automação), próximos passos e a data da confirmação (o dia em que a OS foi gerada). Falta só a observação, a assinatura e o visto. O resto se completa no próprio PDF e o cliente assina. O preenchimento roda no navegador com a [pdf-lib](https://pdf-lib.js.org/) (MIT, em `public/painel/vendor/`).

Contatos que chegam por WhatsApp, telefone ou indicação entram pelo botão **Novo contato** (atalho `N`). A busca no topo (atalho `/`) acha qualquer contato pelo nome, e-mail, telefone ou texto.

Toda mudança de etapa pede confirmação (de qual etapa para qual), seja pela seta, pela ficha, pela trilha ou arrastando. A Central se atualiza sozinha: a cada 5 segundos ela confere um número de versão dos dados (uma linha no banco, que sobe a cada mudança) e, se mudou, recarrega na hora para todos — contato novo, mudança de etapa, arquivo, sem F5. Além disso recarrega a cada 45 segundos, avisa quando chega contato novo e mostra no título da aba quantos ainda não foram lidos. Mover um contato de etapa pode ser desfeito pelo aviso que aparece.

### Acessos

| | Administrador | Funcionário |
| --- | --- | --- |
| Telas | Todas | Caixa de entrada, Concluídos, Agenda e Materiais |
| Contatos | Todos | Só os que tem como responsável |
| Valor, nota fiscal, pagamento | Vê e edita | Não vê (nem na linha do tempo) |
| Notas fiscais e ordens de serviço | Vê e anexa | Não vê (mostram quanto a casa cobra) |
| Documentos do cliente e arquivos da entrega | Vê e anexa | Vê e anexa |
| Etapas | Todas, para frente e para trás ("Mover para…", "Voltar para…", "Reabrir") | Um botão por vez: Iniciar pedido → Entregar → (se reprovada) Entregar nova versão; não entra em Pedido nem Notas e ordens nem reprova |
| Anotações | Sim | Sim, até concluir |
| Arquivar, excluir, cadastrar, equipe | Sim | Não |

Quando o funcionário conclui (chega em Entregue), a demanda sai da caixa de entrada dele e vai para **Concluídos**, só para consulta. Ele pode desfazer o próprio movimento por 10 minutos (inclusive uma entrega feita por engano); depois, só um administrador reabre ou volta etapas.

A regra vale na API: um funcionário não consegue buscar o que não vê na tela.

### Segurança e dados

- **Login:** usuário e senha. Senhas guardadas com PBKDF2 (100 mil iterações, sal próprio). Sessão por cookie `HttpOnly`, `Secure` e `SameSite=Strict`, válida por 7 dias. Depois de 5 erros em 15 minutos, o login trava.
- **Formulário:** no máximo 5 envios a cada 10 minutos por visitante, com o campo anti-robô do site. O IP não é guardado, só um hash dele para contar tentativas.
- **Dados guardados:** os campos do formulário (nome, WhatsApp, e-mail, CPF/CNPJ opcional, plano, descrição e observações) e os documentos anexados (até 10 arquivos e 10 MB). Se o armazenamento passar de 800 MB, os documentos novos ficam só no e-mail e a ficha avisa. Os dados de contato são pessoais: só a equipe com login vê, e o contato pode ser excluído a pedido da pessoa.
- **Equipe:** só administradores dão, mudam e removem acessos. Ninguém muda ou remove o próprio acesso, então sempre sobra um administrador.
- **Anexos:** lista de formatos por fluxo, com o conteúdo real conferido no servidor (`src/arquivos.js`): a extensão precisa estar na lista e os primeiros bytes precisam bater (PDF, Office/OpenDocument pelo ZIP interno, imagens pela assinatura, CSV/TXT sem bytes binários nem página/script disfarçados). O que não confere é recusado; no formulário do site, o arquivo fica de fora e a ficha registra quais foram recusados.
  - Documentos do cliente: PDF, DOC/DOCX, ODT, RTF, TXT, XLS/XLSX, ODS, CSV, JPG, PNG, WEBP, HEIC. Planilha com macros (.xlsm) só em demandas de automação.
  - Entrega: os mesmos (com .xlsm) e vídeo MP4. Notas e ordens: PDF, XML da nota, imagens, Word, Excel, CSV, TXT. Materiais: como a entrega. Moldes: PDF, DOC, DOCX.
  - Macros: .docm, .xlsb, .xlam, .pptm e afins são recusados; um .xlsx/.docx com macro escondida (vbaProject.bin) também. O .xlsm aceito e os .doc/.xls do formato antigo ficam marcados na ficha com um aviso.
  - Download só com login e acesso à demanda; sempre como anexo (`Content-Disposition: attachment`, `application/octet-stream`, `X-Content-Type-Options: nosniff`, sem cache). A chave no armazenamento é aleatória e não existe endereço público para ela.
  - Antivírus: o plano grátis da Cloudflare não tem verificação antimalware para arquivos guardados no KV. A defesa aqui é a lista fechada, a conferência do conteúdo, a recusa de macros fora da automação e o download sempre como arquivo. Para verificação de verdade seria preciso um serviço externo (pago) chamado no envio.
- **Equipe na API:** a `/api/central` manda a equipe toda só para administradores; o funcionário recebe só os próprios dados (nome, apelido, papel), além das demandas dele, sem contato, CPF nem valores do cliente.
- **Anotações:** cada um apaga só as próprias, e só enquanto ainda vê a demanda (o ex-responsável de uma demanda reatribuída ou arquivada não apaga mais).

## Demonstração

Em **https://plannex-demo.luh20123.workers.dev/painel/** fica uma cópia da Central com dados fictícios, como a demonstração da intranet:

- Escolha de perfil sem senha: duas pessoas administradoras e três funcionárias, cada uma com uma dica do que mostra, e um roteiro sugerido.
- Faixa amarela no topo para trocar de perfil, reiniciar os dados ou voltar à escolha.
- Os dados voltam ao exemplo toda madrugada (03h) e pelo botão "Reiniciar dados". As datas são relativas ao dia, então a demonstração nunca parece velha.
- É outro Worker (`plannex-demo`), com banco e arquivos próprios. O modo demonstração falha fechado: só liga com `DEMO=true` **e** `AMBIENTE=demo` **e** com o banco e o armazenamento ligados marcados como demonstração (linha `ambiente = demo` no banco e chave `ambiente` = `demo` no KV). O Worker de produção tem `AMBIENTE=producao` e recusa a demonstração; sem as marcas, `/api/demo/*` responde 404 e nada é reiniciado (o próprio `resetarDemo` também recusa). O `npm run deploy:demo` grava as marcas só nos recursos da demonstração antes de publicar.
- Na demonstração, a página inicial do site leva direto à Central, para ninguém mandar e-mail de verdade pelo formulário. Anexos ficam limitados a 1 MB e 40 envios por dia, para não gastar a cota grátis da conta.

Para publicar uma versão nova da demonstração: `npm run deploy:demo`. Para ver no computador: `PLANNEX_DEMO=1 PORT=5331 node tools/servidor-local.mjs`.

## Arquivos

```
public/                     tudo que o site publica
  index.html                página única, com endereços limpos (/, /automacao, /contato…)
  _headers                  cabeçalhos de segurança e cache
  assets/css, assets/img    estilos, logo, ícones e imagem de compartilhamento
  assets/js/script.revNNN.js        navegação, animações, demonstrações e envio do formulário por e-mail
  assets/js/calculos-ui.revNNN.js   demonstração do laboratório de cálculo
  assets/js/registro-contato.revNNN.js  registra cada envio do formulário no painel
  painel/                   Central: index.html, central.css e js/ (uma tela por arquivo)
src/index.js                Worker: serve public/ e responde a API em /api/
src/senha.js                hash de senha (PBKDF2), usado pelo Worker e pelas ferramentas
src/demo.js                 perfis e dados fictícios da demonstração
src/arquivos.js             formatos aceitos por fluxo e conferência do conteúdo dos arquivos
tests/                      testes automatizados (npm test), com banco e arquivos em memória
migrations/                 tabelas do banco D1
tools/criar-usuario.mjs     cria usuário do painel ou troca a senha
tools/servidor-local.mjs    prévia local sem o workerd
tools/ambiente-local.mjs    banco (node:sqlite), KV e arquivos simulados, usados pela prévia e pelos testes
tools/backup.mjs            backup do banco e dos arquivos para uma pasta local
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

Testes automatizados (segurança da demonstração, anotações, acesso por papel, uploads e downloads, sessão e triagem): `npm test`.

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

## Segurança (resumo)

## Backup

A Cloudflare guarda um histórico do banco D1 (Time Travel: dá para voltar a um ponto dos últimos dias), mas não há cópia dos arquivos do KV nem cópia fora da Cloudflare. Para isso existe `tools/backup.mjs`:

```bash
node tools/backup.mjs              # produção
node tools/backup.mjs --env demo   # demonstração
```

Copia o banco inteiro (`banco.sql`) e cada arquivo do KV para `backups/AAAA-MM-DD_HHMM/` (fora do git), com um LEIA-ME de como restaurar. Só lê, e cabe no plano grátis (uma exportação do D1 e uma leitura por arquivo). Sugestão: rodar toda semana e depois de entregas importantes, e guardar a pasta também fora do computador (HD externo ou nuvem da empresa). A pasta tem dados pessoais: trate como documento sigiloso.

## Endereços, buscadores e 404

`robots.txt` libera o site e bloqueia `/painel/` e `/api/`; `sitemap.xml` lista a página inicial e a de privacidade; as duas páginas têm `canonical`. Usam o domínio oficial `plannex.online` (index.html, privacidade.html, sitemap.xml e robots.txt). Endereço que não existe mostra `404.html` com status 404 (`not_found_handling` no `wrangler.jsonc`). Na demonstração, o `robots.txt` pede para não indexar nada.

O site é uma página só (`index.html`), com endereços limpos, sem "#": `/`, `/automacao`, `/contato` e as seções com atalho (`/calculos`, `/como-funciona`, `/formas-de-contratacao`, `/planos-de-automacao`). O Worker entrega a página única nesses caminhos (`ROTAS_DO_SITE` em `src/index.js` e `run_worker_first` no `wrangler.jsonc`) e o script abre a página ou rola até a seção, com voltar/avançar do navegador funcionando. Endereços antigos com "#" (ex.: `/#contato`) continuam valendo e viram o caminho limpo. `/privacidade` e `/termos` abrem a página de Privacidade e Termos. Para um caminho novo, inclua-o nos três lugares (`ROTAS_DO_SITE`, `run_worker_first` e `SECTION_PATHS`/`PAGE_PATHS` no script).

## Segurança do site

A página só carrega arquivos do próprio site. A Content-Security-Policy libera, fora isso, apenas o envio ao FormSubmit; não há scripts, fontes ou rastreadores de terceiros. O painel não aparece em buscadores (`noindex`) e toda escrita na API precisa vir do próprio site.
