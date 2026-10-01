'use strict';
// Registra cada solicitação na caixa de entrada do painel interno (/painel/).
// O e-mail continua saindo pelo script principal; este registro é à parte e silencioso:
// se falhar, o visitante não percebe nada.
(() => {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  form.addEventListener('submit', () => {
    // Mesmas validações do script principal: só registra o que ele também vai enviar.
    const servico = form.querySelector('[data-contact-service]:checked')?.dataset.contactService;
    if (!servico || !form.checkValidity()) return;
    const arquivos = form.querySelector('#contact-files');
    const totalBytes = arquivos ? [...arquivos.files].reduce((soma, arquivo) => soma + arquivo.size, 0) : 0;
    if (totalBytes > 10 * 1024 * 1024) return;

    fetch('/api/contato', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        servico,
        nome: (form.querySelector('#contact-name')?.value || '').trim(),
        _honey: form.querySelector('[name="_honey"]')?.value || '',
      }),
      keepalive: true,
    }).catch(() => {});
  });
})();
