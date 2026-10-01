# 📊 Plannex

Site da **Plannex**, com duas frentes de serviço:

- **Cálculos judiciais e financeiros**, feitos por economistas: atualização monetária, juros, apuração e liquidação, conferência e contestação. A entrega é a memória de cálculo em Excel e o parecer técnico assinado.
- **Automação de planilhas** no Excel e no Office: planilhas sob medida, relatórios, macros, botões e VBA, gráficos e painéis.

**[Abrir site →](https://misty-king-c67fe.luh20123.workers.dev/)** · [Espelho no GitHub Pages](https://gotardon1.github.io/Plannex/)

## O que tem no site

| Seção | O que mostra |
| --- | --- |
| Início | Serviços de cálculo, formas de contratação (cálculo simples e personalizado) e o passo a passo do atendimento |
| Laboratório Plannex | Demonstração animada de uma memória de cálculo indo dos documentos ao parecer, com dados fictícios |
| Exemplo de memória | Tabela ilustrativa com competência, fator, valor corrigido, juros e total |
| Serviço de Automação | Planos de automação, a demonstração "da bagunça ao controle" e a lista do que pode ser automatizado |
| Contato | Formulário que envia por e-mail (FormSubmit) ou abre o WhatsApp com a mensagem pronta |

Os exemplos de cálculo e de planilha usam valores fictícios.

## Arquivos

```
index.html                  página única, navegação por âncoras (#inicio, #automacao, #contato)
_headers                    cabeçalhos de segurança e cache para o Cloudflare
.nojekyll                   publica no GitHub Pages sem processar com Jekyll
assets/css/style.revNNN.css estilos
assets/css/noscript.css     ajuste para quem navega sem JavaScript
assets/js/script.revNNN.js  navegação, animações, demonstrações e formulário de contato
assets/js/calculos-ui.revNNN.js  demonstração do laboratório de cálculo
assets/img/                 logo, ícones e imagem de compartilhamento
```

O número `revNNN` no nome dos arquivos é o controle de cache: a cada versão nova o arquivo muda de nome, então o navegador nunca usa um CSS ou JS antigo. O `_headers` guarda esses arquivos em cache por um ano e sempre revalida o `index.html`.

## Como rodar

É um site estático, sem instalação nem compilação. Para ver no computador, sirva a pasta com qualquer servidor local, por exemplo:

```bash
npx serve .
```

Abrir o `index.html` direto pelo arquivo também funciona, mas o envio do formulário só é testável num endereço `http(s)`.

## Configuração do contato

No início de `assets/js/script.revNNN.js`:

- `WHATSAPP_NUMBER`: 55 + DDD + número, só dígitos.
- `FORM_SUBMIT_ENDPOINT`: endereço do FormSubmit com o e-mail que recebe os pedidos.

## Publicação

- **Cloudflare** (endereço principal): publica a pasta como site estático e aplica o `_headers`.
- **GitHub Pages**: branch `master`, pasta raiz. O Pages ignora o `_headers`, mas a política de segurança também está numa `<meta>` do `index.html`.

## Segurança

A página só carrega arquivos do próprio site. A Content-Security-Policy libera, fora isso, apenas o envio ao FormSubmit; não há scripts, fontes ou rastreadores de terceiros.
