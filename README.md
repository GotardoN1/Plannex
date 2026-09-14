# Planex — GitHub Pages

Site estático pronto para publicação, sem instalação ou compilação.
Layout, animações e conteúdo do projeto original preservados.

## Publicar pelo navegador

1. Extraia este ZIP no computador. Não envie o ZIP ou RAR ao repositório.
2. Crie um repositório público no GitHub, por exemplo `planex`.
3. Clique em **Add file → Upload files** e envie os arquivos que estão dentro da pasta extraída. O `index.html` deve aparecer diretamente na raiz do repositório, ao lado de `style.css` e `script.js`, sem pastas `PlaneX-projeto` ou `Planex` acima dele.
4. Inclua o arquivo `.nojekyll`. Caso ele não apareça ao selecionar arquivos, use **Add file → Create new file**, nomeie como `.nojekyll` e salve com uma linha vazia.
5. Clique em **Commit changes** para salvar os arquivos na branch `main`.
6. Abra **Settings → Pages**.
7. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
8. Selecione **main** e **/(root)**. Clique em **Save**.
9. Aguarde a publicação. O endereço ficará disponível nessa mesma tela, geralmente `https://SEU-USUARIO.github.io/planex/`.

Para atualizar, envie os arquivos alterados à mesma branch. A publicação será atualizada automaticamente.

## Configurar os contatos

No início de `script.js`, preencha `WHATSAPP_NUMBER` com 55 + DDD + número, somente dígitos, e `CONTACT_EMAIL` com o e-mail comercial real. Mantenha os valores entre aspas.

Esses campos vieram vazios no projeto original. Enquanto estiverem vazios, o envio ficará indisponível. O formulário utiliza o serviço externo FormSubmit: confirme o e-mail conforme as instruções do serviço e teste uma entrega real após publicar. O GitHub Pages hospeda o site; não processa e-mails.

## Compatibilidade

- `index.html` na raiz do pacote.
- Arquivos locais com caminhos relativos, compatíveis com um repositório de qualquer nome.
- Navegação por âncoras (`#inicio`, `#solucoes`, `#planos`, `#contato`), sem necessidade de reescrita de rotas.
- `.nojekyll` incluído para servir o projeto estático sem processamento Jekyll.
- Nenhuma dependência de Node.js, npm, servidor PHP ou banco de dados.

## Conferência realizada

Sintaxe dos dois arquivos JavaScript, existência dos arquivos referenciados pelo HTML e acesso HTTP aos recursos na raiz e sob `/planex/`. Publicação real no GitHub e entrega de contatos não foram realizadas.

Documentação: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
