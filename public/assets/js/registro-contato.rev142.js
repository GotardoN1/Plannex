'use strict';
// Registra cada solicitação na Central da Plannex (/painel/), com os documentos anexados.
// O e-mail continua saindo pelo script principal; este registro é à parte e silencioso:
// se falhar, o visitante não percebe nada e o e-mail chega do mesmo jeito.
(() => {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  const valor = seletor => (form.querySelector(seletor)?.value || '').trim();
  const marcado = nome => form.querySelector(`[name="${nome}"]:checked`)?.value || '';
  const visivel = seletor => {
    const campo = form.querySelector(seletor);
    return campo && !campo.disabled && campo.offsetParent !== null ? campo.value.trim() : '';
  };

  form.addEventListener('submit', () => {
    // Mesmas validações do script principal: só registra o que ele também vai enviar.
    const servico = form.querySelector('[data-contact-service]:checked')?.dataset.contactService;
    if (!servico || !form.checkValidity()) return;
    const campoArquivos = form.querySelector('#contact-files');
    const arquivos = campoArquivos && !campoArquivos.disabled ? [...campoArquivos.files] : [];
    const totalBytes = arquivos.reduce((soma, arquivo) => soma + arquivo.size, 0);
    if (totalBytes > 10 * 1024 * 1024) return;

    const dados = {
      servico,
      nome: valor('#contact-name'),
      telefone: valor('#contact-phone'),
      email: valor('#contact-email'),
      plano: marcado('Plano de interesse'),
      descricao: valor('#contact-description'),
      atividade_manual: visivel('#contact-manual-task'),
      manter_inalterado: visivel('#contact-keep-unchanged'),
      envio_documentos: marcado('Envio de documentos'),
      observacoes: valor('#contact-notes'),
      chamada: valor('#contact-origin'),
      _honey: valor('[name="_honey"]'),
    };

    // Sem documentos: JSON com keepalive. Com documentos: multipart (o keepalive não aceita arquivos grandes).
    let envio;
    if (arquivos.length) {
      const corpo = new FormData();
      for (const [chave, texto] of Object.entries(dados)) corpo.append(chave, texto);
      for (const arquivo of arquivos) corpo.append('arquivos', arquivo, arquivo.name);
      envio = fetch('/api/contato', { method: 'POST', body: corpo });
    } else {
      envio = fetch('/api/contato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
        keepalive: true,
      });
    }
    envio.catch(() => {});
  });
})();
