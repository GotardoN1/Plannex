'use strict';
// Registra cada solicitação na Central da Plannex (/painel/), com os documentos anexados.
// O script principal chama window.PlannexCentral.registrar(form) antes do e-mail (a Central devolve o
// protocolo, que vai no assunto) e considera o pedido enviado se qualquer um dos dois confirmar.
(() => {
  const valor = (form, seletor) => (form.querySelector(seletor)?.value || '').trim();
  const marcado = (form, nome) => form.querySelector(`[name="${nome}"]:checked`)?.value || '';
  const visivel = (form, seletor) => {
    const campo = form.querySelector(seletor);
    return campo && !campo.disabled && campo.offsetParent !== null ? campo.value.trim() : '';
  };

  // Resolve com { ok, repetido, protocolo } e nunca rejeita (falha vira { ok: false }).
  async function registrar(form, arquivos = []) {
    const servico = form.querySelector('[data-contact-service]:checked')?.dataset.contactService;
    if (!servico) return { ok: false };
    const dados = {
      servico,
      nome: valor(form, '#contact-name'),
      telefone: valor(form, '#contact-phone'),
      email: valor(form, '#contact-email'),
      cpf: valor(form, '#contact-cpf'),
      plano: form.querySelector('[data-contact-service]:checked')?.dataset.contactPlan || '',
      descricao: valor(form, '#contact-description'),
      atividade_manual: visivel(form, '#contact-manual-task'),
      manter_inalterado: visivel(form, '#contact-keep-unchanged'),
      envio_documentos: marcado(form, 'Envio de documentos'),
      observacoes: valor(form, '#contact-notes'),
      chamada: valor(form, '#contact-origin'),
      _honey: valor(form, '[name="_honey"]'),
    };
    try {
      let resposta;
      // Sem documentos: JSON com keepalive. Com documentos: multipart (o keepalive não aceita arquivos grandes).
      if (arquivos.length) {
        const corpo = new FormData();
        for (const [chave, texto] of Object.entries(dados)) corpo.append(chave, texto);
        for (const arquivo of arquivos) corpo.append('arquivos', arquivo, arquivo.name);
        resposta = await fetch('/api/contato', { method: 'POST', body: corpo });
      } else {
        resposta = await fetch('/api/contato', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
          keepalive: true,
        });
      }
      const retorno = await resposta.json().catch(() => ({}));
      return { ok: resposta.ok && retorno.ok !== false, repetido: Boolean(retorno.repetido), protocolo: retorno.protocolo || '' };
    } catch {
      return { ok: false };
    }
  }

  window.PlannexCentral = { registrar };
})();
