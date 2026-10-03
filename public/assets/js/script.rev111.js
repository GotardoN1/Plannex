'use strict';
// Configure apenas com os canais comerciais confirmados. Sem configuração, não há envio.
const WHATSAPP_NUMBER = '5511945383454';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pages = $$('.page');
const pageIds = pages.map(page => page.id);
const frameJobs = new Map();
const motionJobs = new Set();
let onPageChange = () => {};

const contactTextJobs = new WeakMap();
function fadeSwap(element, nextText, duration = 240) {
  if (!element) return;
  const currentJob = contactTextJobs.get(element);
  if (currentJob) currentJob.cancel();
  if ((element.textContent || '') === nextText) return;
  if (reducedMotion.matches || typeof element.animate !== 'function') {
    element.textContent = nextText;
    return;
  }
  const outDuration = Math.round(duration * .42);
  const inDuration = duration - outDuration;
  const fadeOut = element.animate(
    [{ opacity: 1 }, { opacity: .18 }],
    { duration: outDuration, easing: 'ease-out', fill: 'forwards' }
  );
  contactTextJobs.set(element, fadeOut);
  fadeOut.onfinish = () => {
    if (contactTextJobs.get(element) !== fadeOut) return;
    element.textContent = nextText;
    const fadeIn = element.animate(
      [{ opacity: .18 }, { opacity: 1 }],
      { duration: inDuration, easing: 'ease-in', fill: 'forwards' }
    );
    contactTextJobs.set(element, fadeIn);
    fadeIn.onfinish = fadeIn.oncancel = () => {
      if (contactTextJobs.get(element) === fadeIn) contactTextJobs.delete(element);
    };
  };
  fadeOut.oncancel = () => {
    if (contactTextJobs.get(element) === fadeOut) contactTextJobs.delete(element);
  };
}

function toggleContactPlanHelp(show) {
  const note = $('#contact-plan-help');
  if (!note) return;
  if (reducedMotion.matches || typeof note.animate !== 'function') {
    note.hidden = !show;
    return;
  }
  if (show) {
    if (!note.hidden) return;
    note.hidden = false;
    const targetHeight = note.scrollHeight;
    note.animate(
      [
        { opacity: 0, height: '0px', marginTop: '0px', transform: 'translateY(-3px)' },
        { opacity: 1, height: `${targetHeight}px`, marginTop: '2px', transform: 'translateY(0)' }
      ],
      { duration: 220, easing: 'cubic-bezier(.22,.61,.36,1)' }
    ).onfinish = () => {
      note.style.height = '';
      note.style.marginTop = '';
      note.style.transform = '';
      note.style.opacity = '';
    };
  } else {
    if (note.hidden) return;
    const startHeight = note.getBoundingClientRect().height;
    const animation = note.animate(
      [
        { opacity: 1, height: `${startHeight}px`, transform: 'translateY(0)' },
        { opacity: 0, height: '0px', transform: 'translateY(-3px)' }
      ],
      { duration: 170, easing: 'ease-out' }
    );
    animation.onfinish = () => { note.hidden = true; };
  }
}

let contactCopyVersion = 0;
const contactHeightJobs = new WeakMap();

function smoothContactCopy(nextTitle, nextLead, duration = 300) {
  const heading = document.querySelector('#contato .section-heading');
  const title = $('#contact-title');
  const lead = $('#contact-lead');
  if (!heading || !title || !lead) return;

  const version = ++contactCopyVersion;
  const runningHeight = contactHeightJobs.get(heading);
  if (runningHeight) runningHeight.cancel();
  heading.getAnimations().forEach(animation => animation.cancel());
  title.getAnimations().forEach(animation => animation.cancel());
  lead.getAnimations().forEach(animation => animation.cancel());

  // Sempre restaura o estado visível antes de uma nova troca. Isso evita
  // que cliques rápidos deixem título ou descrição presos em baixa opacidade.
  heading.style.height = '';
  heading.style.overflow = '';
  heading.style.opacity = '1';
  heading.style.transform = 'translateY(0)';
  title.style.opacity = '1';
  lead.style.opacity = '1';

  if ((title.textContent || '') === nextTitle && (lead.textContent || '') === nextLead) return;

  if (reducedMotion.matches || typeof heading.animate !== 'function') {
    title.textContent = nextTitle;
    lead.textContent = nextLead;
    return;
  }

  const startHeight = heading.getBoundingClientRect().height;
  const fadeOut = heading.animate(
    [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: .42, transform: 'translateY(-2px)' }
    ],
    { duration: 105, easing: 'ease-out', fill: 'forwards' }
  );

  fadeOut.onfinish = () => {
    if (version !== contactCopyVersion) return;

    title.textContent = nextTitle;
    lead.textContent = nextLead;

    heading.style.height = 'auto';
    const targetHeight = heading.getBoundingClientRect().height;
    heading.style.height = `${startHeight}px`;
    heading.style.overflow = 'hidden';

    const heightAnimation = heading.animate(
      [
        { height: `${startHeight}px`, opacity: .42, transform: 'translateY(-2px)' },
        { height: `${targetHeight}px`, opacity: 1, transform: 'translateY(0)' }
      ],
      { duration: Math.max(230, duration), easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' }
    );
    contactHeightJobs.set(heading, heightAnimation);

    const cleanup = () => {
      if (contactHeightJobs.get(heading) === heightAnimation) contactHeightJobs.delete(heading);
      if (version !== contactCopyVersion) return;
      heading.style.height = '';
      heading.style.overflow = '';
      heading.style.opacity = '1';
      heading.style.transform = 'translateY(0)';
      title.style.opacity = '1';
      lead.style.opacity = '1';
    };
    heightAnimation.onfinish = cleanup;
    heightAnimation.oncancel = cleanup;
  };

  fadeOut.oncancel = () => {
    if (version !== contactCopyVersion) return;
    heading.style.opacity = '1';
    heading.style.transform = 'translateY(0)';
    title.style.opacity = '1';
    lead.style.opacity = '1';
  };
}

const interestHeightJobs = new WeakMap();
function animateInterestFieldHeight(field, beforeHeight, duration = 300) {
  if (!field || !beforeHeight) return;
  const running = interestHeightJobs.get(field);
  if (running) running.cancel();
  field.style.height = '';
  field.style.overflow = '';

  if (reducedMotion.matches || typeof field.animate !== 'function') return;
  const targetHeight = field.getBoundingClientRect().height;
  if (Math.abs(targetHeight - beforeHeight) < 1) return;

  field.style.height = `${beforeHeight}px`;
  field.style.overflow = 'hidden';
  const animation = field.animate(
    [{height:`${beforeHeight}px`},{height:`${targetHeight}px`}],
    {duration,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'}
  );
  interestHeightJobs.set(field, animation);
  const cleanup = () => {
    if (interestHeightJobs.get(field) === animation) interestHeightJobs.delete(field);
    field.style.height = '';
    field.style.overflow = '';
  };
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
}

function animateNumber(element, from, to, format, duration = 750) {
  const previous = frameJobs.get(element);
  if (previous) cancelAnimationFrame(previous.frame);
  if (reducedMotion.matches) { element.textContent = format(to); frameJobs.delete(element); return; }
  const job = { frame: 0, finish: () => { element.textContent = format(to); } };
  const start = performance.now();
  function draw(now) {
    const progress = Math.min(1, (now - start) / duration);
    const span = Math.abs(to - from);
    const eased = span <= 12 ? progress : 1 - Math.pow(1 - progress, 3);
    element.textContent = format(from + (to - from) * eased);
    if (progress < 1) job.frame = requestAnimationFrame(draw);
    else frameJobs.delete(element);
  }
  frameJobs.set(element, job);
  job.frame = requestAnimationFrame(draw);
}
function cancelNumber(element) {
  const job = frameJobs.get(element);
  if (job) cancelAnimationFrame(job.frame);
  frameJobs.delete(element);
}
function reveal(element, delay = 0) {
  if (reducedMotion.matches || !element.animate) return;
  const animation = element.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 520, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
  motionJobs.add(animation);
  animation.onfinish = animation.oncancel = () => motionJobs.delete(animation);
}

let headerCtaSwapTimer = 0;
function setHeaderCtaText(text) {
  const headerCta = $('#header-cta');
  if (!headerCta || headerCta.textContent === text) return;
  window.clearTimeout(headerCtaSwapTimer);
  if (reducedMotion.matches) {
    headerCta.textContent = text;
    headerCta.classList.remove('is-copy-changing');
    return;
  }
  headerCta.classList.add('is-copy-changing');
  headerCtaSwapTimer = window.setTimeout(() => {
    headerCta.textContent = text;
    requestAnimationFrame(() => window.setTimeout(() => headerCta.classList.remove('is-copy-changing'), 35));
  }, 190);
}

function showPage(id, focus = false) {
  const targetId = pageIds.includes(id) ? id : 'inicio';
  const oldId = document.body.dataset.page;
  const changedPage = oldId !== targetId;
  pages.forEach(page => page.classList.toggle('is-active', page.id === targetId));
  $$('header nav a').forEach(link => {
    const active = link.hash === '#' + targetId;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.body.dataset.page = targetId;
  const automationContext = targetId === 'automacao';
  const headerCta = $('#header-cta');
  setHeaderCtaText(automationContext ? 'Solicitar automação' : targetId === 'contato' ? 'Enviar solicitação' : 'Solicitar cálculo');
  if (headerCta) {
    headerCta.href = '#contato';
    headerCta.dataset.contactArea = automationContext ? 'automacao' : targetId === 'inicio' ? 'calculos' : '';
  }
  if (changedPage) window.scrollTo({ top: 0, behavior: 'auto' });
  if (focus) {
    const title = $('#' + targetId).querySelector('h1,h2');
    if (title) {
      title.setAttribute('tabindex', '-1');
      title.focus({ preventScroll: true });
    }
  }
  if (!changedPage) {
    updateReadingProgress();
    return;
  }
  onPageChange();
  document.title = ({inicio:'Plannex | Início',calculos:'Plannex | Cálculos judiciais e financeiros',automacao:'Plannex | Serviço de Automação',contato:'Plannex | Solicitação de serviço'})[targetId];
  updateReadingProgress();
}
function navigate(id, focus = true) {
  if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  showPage(id, focus);
}
$$('a[href^="#"]').forEach(link => {
  if (link.hasAttribute('data-scroll-target') || link.hasAttribute('data-contact-area') || link.hasAttribute('data-contact-context')) return;
  const id = link.getAttribute('href').slice(1);
  if (!pageIds.includes(id)) return;
  link.addEventListener('click', event => { event.preventDefault(); navigate(id); });
});
$$('[data-page-target][data-scroll-target]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    const pageId = link.dataset.pageTarget;
    const target = $('#' + link.dataset.scrollTarget);
    if (!pageIds.includes(pageId) || !target) return;
    if (location.hash !== '#' + pageId) history.pushState(null, '', '#' + pageId);
    showPage(pageId, false);
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    });
  });
});
$('.skip-link')?.addEventListener('click', event => {
  event.preventDefault();
  $('#conteudo').focus({ preventScroll: true });
  $('#conteudo').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
});
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (id && !pageIds.includes(id)) {
    history.replaceState(null, '', '#inicio');
    showPage('inicio', true);
    return;
  }
  showPage(id, true);
});
$('#year').textContent = new Date().getFullYear();

// A lightweight reading cue uses one animation frame per scroll update.
let readingFrame = 0;
function updateReadingProgress() {
  if (readingFrame) return;
  readingFrame = requestAnimationFrame(() => {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const progress = height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0;
    $('.reading-progress span').style.transform = `scaleX(${progress})`;
    readingFrame = 0;
  });
}
window.addEventListener('scroll', updateReadingProgress, { passive: true });
window.addEventListener('resize', updateReadingProgress, { passive: true });
const initialHash = location.hash.slice(1);
if (initialHash && !pageIds.includes(initialHash)) history.replaceState(null, '', '#inicio');
showPage(pageIds.includes(initialHash) ? initialHash : 'inicio');

// Movimento ambiente sutil: a luz acompanha o cursor sem interferir na leitura.
const backgroundGlow = $('.bg-glow');
let pointerFrame = 0;
window.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType === 'touch' || pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    const x = Math.max(0, Math.min(100, event.clientX / window.innerWidth * 100));
    const y = Math.max(0, Math.min(100, event.clientY / window.innerHeight * 100));
    backgroundGlow.style.setProperty('--pointer-x', x.toFixed(1) + '%');
    backgroundGlow.style.setProperty('--pointer-y', y.toFixed(1) + '%');
    pointerFrame = 0;
  });
}, { passive: true });

const dialog = $('#contact-dialog');

function openWhatsAppMessage(message) {
  const normalizedWhatsapp = String(WHATSAPP_NUMBER || '').replace(/\D/g, '');
  if (!normalizedWhatsapp || !/^\d{10,15}$/.test(normalizedWhatsapp)) return false;
  const url = new URL(`https://wa.me/${normalizedWhatsapp}`);
  url.searchParams.set('text', message);
  // Uma única navegação evita abrir o mesmo texto duas vezes em alguns navegadores.
  window.location.assign(url.toString());
  return true;
}

$('#whatsapp')?.addEventListener('click', () => {
  const message = 'Olá, tudo bem? Tenho uma dúvida sobre os serviços da Plannex.';
  if (!openWhatsAppMessage(message)) dialog?.showModal();
});
$$('.close, #close-dialog').forEach(button => button.addEventListener('click', () => dialog?.close()));
dialog?.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

// REV91 — formulário inteligente: serviço + plano + dados essenciais + campos extras apenas em automação.
let contactOrigin = '';
const FORM_SUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/contato.robson333@gmail.com';
const contactFiles = $('#contact-files');
const contactFileSummary = $('#contact-file-summary');
const contactFileField = $('#contact-file-field');
const contactAttachmentFieldset = $('#contact-attachment-fieldset');
const contactPlanOptions = {
  calculos: [
    { value: 'Cálculo simples', title: 'Cálculo simples', price: 'R$149,90', detail: 'Na primeira compra, 2 cálculos simples pelo preço de 1.' },
    { value: 'Pacote 10 cálculos', title: 'Pacote 10 cálculos', price: 'R$1.199,00', detail: '10 cálculos simples por R$119,90 cada, para usar em até 12 meses.' },
    { value: 'Cálculo personalizado', title: 'Cálculo personalizado', price: 'Sob Orçamento', detail: 'Processos extensos, múltiplos autores ou análise detalhada.' }
  ],
  automacao: [
    { value: 'Automação Pontual', title: 'Automação Pontual', price: 'R$199,90', detail: 'Criação, melhoria ou automação com escopo definido.' },
    { value: 'Pacote Evolução', title: 'Pacote Evolução', price: 'R$399,90', detail: '4 demandas no total: 2 planilhas ou fluxos principais + 2 adições. Contratadas separadamente, custariam R$599,80 — economia de R$199,90.' },
    { value: 'Automação personalizada', title: 'Automação personalizada', price: 'Sob Orçamento', detail: 'Projetos maiores, várias planilhas conectadas ou integrações sob medida.' }
  ]
};
const contactDocumentExamples = {
  calculos: 'Sentença, acórdão, petição inicial, holerites/contracheques, memória de cálculo, planilhas ou outros documentos do caso.',
  automacao: 'Planilha atual, arquivo de exemplo, demonstrativo ou imagens das abas/processos que deseja automatizar.'
};

function syncContactAttachmentAvailability() {
  const serviceSelected = Boolean(document.querySelector('[data-contact-service]:checked'));
  const planSelected = Boolean(document.querySelector('#contact-plan-choices input[type="radio"]:checked'));
  const ready = serviceSelected && planSelected;

  if (!ready) {
    if (contactAttachmentFieldset) contactAttachmentFieldset.hidden = true;
    if (contactFileField) contactFileField.hidden = true;
    if (contactFiles) {
      contactFiles.disabled = true;
      contactFiles.value = '';
    }
    return;
  }

  showContactAttachmentChoices();
}

function renderContactPlans(service, selectedPlan = '') {
  const fieldset = $('#contact-plan-fieldset');
  const container = $('#contact-plan-choices');
  if (!fieldset || !container || !contactPlanOptions[service]) return;
  fieldset.dataset.service = service;
  container.innerHTML = contactPlanOptions[service].map((plan, index) => `
    <label class="contact-plan-choice">
      <input ${index === 0 ? 'required' : ''} name="Plano de interesse" type="radio" value="${plan.value}">
      <span aria-hidden="true" class="contact-plan-radio"></span>
      <span class="contact-plan-choice-copy"><strong class="contact-plan-inline-title">${plan.title} <span>(${plan.price})</span></strong><small>${plan.detail}</small></span>
    </label>`).join('');
  fieldset.hidden = false;

  const radios = [...container.querySelectorAll('input[type="radio"]')];
  const syncVisual = () => {
    container.querySelectorAll('.contact-plan-choice').forEach(label => {
      label.classList.toggle('is-selected', Boolean(label.querySelector('input')?.checked));
    });
  };
  radios.forEach(radio => radio.addEventListener('change', () => {
    syncVisual();
    syncContactAttachmentAvailability();
  }));
  const preset = radios.find(radio => radio.value === selectedPlan);
  if (preset) preset.checked = true;
  syncVisual();
  syncContactAttachmentAvailability();
}

function setAutomationContactFields(active) {
  const wrapper = $('#contact-automation-extra');
  const manualTask = $('#contact-manual-task');
  const keepUnchanged = $('#contact-keep-unchanged');
  if (wrapper) wrapper.hidden = !active;
  [manualTask, keepUnchanged].filter(Boolean).forEach(field => {
    field.disabled = !active;
    if (!active) field.value = '';
  });
  if (manualTask) manualTask.required = active;
  if (keepUnchanged) keepUnchanged.required = false;
}

function setContactDocumentCopy(service) {
  const summary = $('#contact-file-summary');
  const help = $('#contact-file-help');
  if (summary && !$('#contact-files')?.files?.length) {
    summary.textContent = contactDocumentExamples[service] || 'Selecione os arquivos que ajudam a entender sua demanda.';
  }
  if (help) {
    help.textContent = service === 'automacao'
      ? 'Excel, PDF, Word ou imagem · até 10 MB no total.'
      : 'PDF, Excel, Word ou imagem · até 10 MB no total.';
  }
}

function setContactService(service, options = {}) {
  if (!['calculos','automacao'].includes(service)) return;
  document.body.dataset.contactTheme = service;
  const input = document.querySelector(`[data-contact-service="${service}"]`);
  if (!input) return;
  input.checked = true;

  $$('[data-contact-choice]').forEach(choice => {
    const active = choice.dataset.contactChoice === service;
    choice.classList.toggle('is-selected', active);
  });

  const description = $('#contact-description');
  if (description) {
    const example = $('#contact-description-example');
    const copy = service === 'calculos'
      ? description.dataset.placeholderCalculos
      : description.dataset.placeholderAutomacao;
    description.placeholder = '';
    if (example) example.textContent = copy;
  }
  renderContactPlans(service, options.plan || '');
  setAutomationContactFields(service === 'automacao');
  setContactDocumentCopy(service);
  if (contactAttachmentFieldset) contactAttachmentFieldset.hidden = true;
  if (contactFileField) contactFileField.hidden = true;
  if (contactFiles) { contactFiles.disabled = true; contactFiles.value = ''; }
  syncContactAttachmentAvailability();

  if (options.focus) requestAnimationFrame(() => $('#contact-name')?.focus({ preventScroll: true }));
}

$$('[data-contact-service]').forEach(input => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    contactOrigin = '';
    const originInput = $('#contact-origin');
    if (originInput) originInput.value = '';
    setContactService(input.dataset.contactService);
  });
});

const restoredContactService = document.querySelector('[data-contact-service]:checked');
if (restoredContactService) setContactService(restoredContactService.dataset.contactService);

// CTAs comerciais levam ao mesmo formulário, pré-selecionando serviço e plano quando houver.
$$('a[data-contact-area],button[data-contact-area]').forEach(control => {
  control.addEventListener('click', event => {
    event.preventDefault();
    const service = control.dataset.contactArea;
    const presetPlan = control.dataset.plan || '';
    contactOrigin = presetPlan || control.dataset.need || control.dataset.contactNeed || '';
    const originInput = $('#contact-origin');
    if (originInput) originInput.value = contactOrigin;

    const planCard = control.closest('.plan,.calc-price-card');
    if (planCard && !reducedMotion.matches && planCard.animate) {
      planCard.animate([
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-2px) scale(1.012)' },
        { transform: 'translateY(0) scale(1)' }
      ], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }

    if (location.hash !== '#contato') history.pushState(null, '', '#contato');
    showPage('contato', false);
    if (['calculos','automacao'].includes(service)) setContactService(service, { plan: presetPlan });
    requestAnimationFrame(() => {
      $('#contact-form')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    });
  });
});

const contactPhone = $('#contact-phone');
function formatBrazilianMobilePhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}
function syncContactPhoneMask() {
  if (!contactPhone) return;
  const formatted = formatBrazilianMobilePhone(contactPhone.value);
  if (contactPhone.value !== formatted) contactPhone.value = formatted;
}
if (contactPhone) {
  ['input','change','blur'].forEach(type => contactPhone.addEventListener(type, syncContactPhoneMask));
  window.addEventListener('pageshow', () => setTimeout(syncContactPhoneMask, 80));
  setTimeout(syncContactPhoneMask, 180);
}

function resetContactAttachmentChoice() {
  const later = document.querySelector('[data-attachment-choice="later"]');
  const now = document.querySelector('[data-attachment-choice="now"]');
  if (now) now.checked = true;
  if (later) later.checked = false;
  setContactAttachmentMode('now');
}

function showContactAttachmentChoices() {
  if (contactAttachmentFieldset) contactAttachmentFieldset.hidden = false;
  resetContactAttachmentChoice();
}

function setContactAttachmentMode(mode) {
  const showUpload = mode === 'now';
  $$('[data-attachment-choice]').forEach(input => {
    const label = input.closest('.contact-attachment-choice');
    label?.classList.toggle('is-selected', input.checked);
  });
  if (contactFileField) contactFileField.hidden = !showUpload;
  if (contactFiles) {
    contactFiles.disabled = !showUpload;
    if (!showUpload && contactFiles.files?.length) {
      contactFiles.value = '';
      const service = document.querySelector('[data-contact-service]:checked')?.dataset.contactService || '';
      setContactDocumentCopy(service);
    }
  }
}

$$('[data-attachment-choice]').forEach(input => {
  input.addEventListener('change', () => {
    if (input.checked) setContactAttachmentMode(input.dataset.attachmentChoice);
  });
});
const restoredAttachmentChoice = document.querySelector('[data-attachment-choice]:checked');
setContactAttachmentMode(restoredAttachmentChoice?.dataset.attachmentChoice || 'now');
if (contactAttachmentFieldset) contactAttachmentFieldset.hidden = true;
if (contactFileField) contactFileField.hidden = true;
if (contactFiles) contactFiles.disabled = true;

// Tipos aceitos nos anexos: documentos, planilhas e fotos. Programas, páginas e compactados ficam de fora.
const CONTACT_ALLOWED_FILES = /\.(pdf|xlsx|xlsm|xls|csv|docx?|jpe?g|png|webp|heic)$/i;
const contactBlockedFiles = files => files.filter(file => !CONTACT_ALLOWED_FILES.test(file.name || ''));

// Evita o mesmo pedido em sequência (clique duplo, robô): espera entre envios e o mesmo conteúdo
// não sai de novo em pouco tempo. O servidor também ignora pedidos repetidos.
const CONTACT_WAIT_MS = 30 * 1000;
const CONTACT_SAME_MS = 10 * 60 * 1000;
const contactLastSent = () => { try { return JSON.parse(localStorage.getItem('plannex-ultimo-envio') || 'null'); } catch { return null; } };
const contactRemember = signature => { try { localStorage.setItem('plannex-ultimo-envio', JSON.stringify({ when: Date.now(), signature })); } catch { /* sem armazenamento */ } };
const contactSignature = () => [($('#contact-email')?.value || '').trim().toLowerCase(), ($('#contact-phone')?.value || '').replace(/\D/g, ''), ($('#contact-description')?.value || '').trim()].join('|');

contactFiles?.addEventListener('change', () => {
  const blocked = contactBlockedFiles([...contactFiles.files]);
  if (blocked.length) {
    contactFiles.value = '';
    if (contactFileSummary) contactFileSummary.textContent = `Não aceitamos ${blocked.map(file => file.name).slice(0, 2).join(', ')}. Envie PDF, Excel, Word ou foto (JPG, PNG).`;
    return;
  }
  const files = [...contactFiles.files];
  if (!contactFileSummary) return;
  if (!files.length) {
    const service = document.querySelector('[data-contact-service]:checked')?.dataset.contactService || '';
    contactFileSummary.textContent = contactDocumentExamples[service] || 'Selecione os arquivos que ajudam a entender sua demanda.';
    return;
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const names = files.slice(0, 2).map(file => file.name).join(' · ');
  const more = files.length > 2 ? ` +${files.length - 2}` : '';
  contactFileSummary.textContent = `${names}${more} · ${(total / 1024 / 1024).toFixed(1)} MB`;
});

$('#contact-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $('#contact-status');
  const submit = $('#contact-submit');
  const serviceInput = form.querySelector('[data-contact-service]:checked');

  status?.classList.remove('is-success','is-error');
  if (!serviceInput) {
    if (status) {
      status.textContent = 'Escolha Cálculos ou Automação.';
      status.classList.add('is-error');
    }
    form.querySelector('[data-contact-service]')?.focus();
    return;
  }
  if (!form.checkValidity()) {
    form.reportValidity();
    if (status) {
      status.textContent = 'Confira os campos obrigatórios.';
      status.classList.add('is-error');
    }
    return;
  }

  const files = contactFiles && !contactFiles.disabled ? [...contactFiles.files] : [];
  if (contactBlockedFiles(files).length) {
    if (status) {
      status.textContent = 'Há anexos de um tipo que não aceitamos. Envie PDF, Excel, Word ou foto (JPG, PNG).';
      status.classList.add('is-error');
    }
    contactFiles?.focus();
    return;
  }

  // Espera entre envios e o mesmo pedido não sai duas vezes.
  const last = contactLastSent();
  const signature = contactSignature();
  if (last && Date.now() - last.when < CONTACT_SAME_MS && last.signature === signature) {
    if (status) {
      status.textContent = 'Essa solicitação já foi enviada e chegou para nós. Retornaremos em breve.';
      status.classList.add('is-success');
    }
    return;
  }
  if (last && Date.now() - last.when < CONTACT_WAIT_MS) {
    const seconds = Math.ceil((CONTACT_WAIT_MS - (Date.now() - last.when)) / 1000);
    if (status) {
      status.textContent = `Aguarde ${seconds} segundos para enviar outra solicitação.`;
      status.classList.add('is-error');
    }
    return;
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > 10 * 1024 * 1024) {
    if (status) {
      status.textContent = 'Os arquivos ultrapassam 10 MB no total.';
      status.classList.add('is-error');
    }
    contactFiles?.focus();
    return;
  }

  const formData = new FormData(form);
  const email = ($('#contact-email')?.value || '').trim();
  const name = ($('#contact-name')?.value || '').trim();
  const phone = ($('#contact-phone')?.value || '').trim();
  const serviceLabel = serviceInput.value;

  // Os nomes HTML seguem os padrões reconhecidos pelo preenchimento automático
  // dos navegadores. Antes do envio, normalizamos os rótulos exibidos no e-mail.
  formData.delete('name');
  formData.delete('tel');
  formData.delete('email');
  formData.set('Nome completo', name);
  formData.set('WhatsApp', phone);
  formData.set('E-mail', email);
  formData.set('_replyto', email);
  formData.set('_subject', `Plannex · Nova solicitação · ${serviceLabel} · ${name}`);

  if (submit) {
    submit.disabled = true;
    submit.classList.add('is-loading');
    submit.innerHTML = 'Enviando…';
  }
  if (status) status.textContent = 'Enviando informações e arquivos…';

  try {
    // O e-mail (FormSubmit) e o registro na Central saem juntos. O pedido conta como enviado se a Central
    // confirmar ou se o e-mail confirmar; só dá erro se os dois falharem.
    const emailSending = fetch(FORM_SUBMIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      return response.ok && data.success !== 'false' && data.success !== false;
    }).catch(() => false);
    const centralSending = window.PlannexCentral ? window.PlannexCentral.registrar(form, files) : Promise.resolve({ ok: false });
    const [emailOk, central] = await Promise.all([emailSending, centralSending]);
    if (!emailOk && !central.ok) throw new Error('Falha no envio');

    contactRemember(signature);
    if (status) {
      status.textContent = central.repetido
        ? 'Recebemos sua solicitação (ela já tinha chegado). Retornaremos em breve.'
        : 'Solicitação enviada. Analisaremos e retornaremos em breve.';
      status.classList.add('is-success');
    }
    if (submit) {
      submit.classList.remove('is-loading');
      submit.classList.add('is-sent');
      submit.innerHTML = 'Solicitação enviada ✓';
      // Reabre o botão depois da espera, para uma nova solicitação (diferente) se precisar.
      setTimeout(() => {
        submit.disabled = false;
        submit.classList.remove('is-sent');
        submit.innerHTML = 'Enviar solicitação <span aria-hidden="true">→</span>';
      }, CONTACT_WAIT_MS);
    }
  } catch (error) {
    if (status) {
      status.textContent = 'Não foi possível enviar agora. Tente novamente em instantes.';
      status.classList.add('is-error');
    }
    if (submit) {
      submit.disabled = false;
      submit.classList.remove('is-loading');
      submit.innerHTML = 'Enviar solicitação <span aria-hidden="true">→</span>';
    }
  }
});

// Automation page now uses a static explanatory flow; no secondary interactive demo is loaded.


// REV14 — a página inicial apresenta os componentes do cálculo como uma única entrega.



function initAutomationSheetDemo() {
  const demo = document.querySelector('.automation-demo-single');
  if (!demo) return;
  const state = demo.querySelector('#automation-demo-state');
  const caption = demo.querySelector('#automation-demo-caption');
  const restartButton = demo.querySelector('#automation-demo-restart');
  const chips = [...demo.querySelectorAll('[data-demo-chip]')];
  const rows = [...demo.querySelectorAll('.automation-demo-sheet tbody tr')];
  const headers = [...demo.querySelectorAll('.automation-demo-sheet thead [data-demo-col]')];
  if (!state || !caption || rows.length !== 3) return;

  const scenarios = [
    {
      dirty: [
        ['ANA silva', '12-09-26', '1250', '=#REF!', 'pendente'],
        ['bruno COSTA', '13/9/26', 'R$ 890', '=#N/D', 'duplicado'],
        ['CARLA lima', '13.09.2026', '1480,0', '=#VALOR!', 'sem status']
      ],
      clean: [
        ['Ana Silva', '12/09/2026', 'R$ 1.250,00', '=SOMA(C2:C4)', 'Validado ✓'],
        ['Bruno Costa', '13/09/2026', 'R$ 890,00', '=PROCX(A3;base!A:A;base!D:D)', 'Conferido ✓'],
        ['Carla Lima', '13/09/2026', 'R$ 1.480,00', '=SOMA(C2:C4)', 'Pago ✓']
      ]
    },
    {
      dirty: [
        ['joÃO ALVES', '15.9.26', '2300', '=#NOME?', 'aguardando?'],
        ['MARIA souza', '16-09', 'R$1.075', '=#REF!', 'sem retorno'],
        ['pedro LIMA', '17/9/2026', '980,5', '=#DIV/0!', 'pago?']
      ],
      clean: [
        ['João Alves', '15/09/2026', 'R$ 2.300,00', '=SOMA(C2:C4)', 'Validado ✓'],
        ['Maria Souza', '16/09/2026', 'R$ 1.075,00', '=SEERRO(PROCX(A3;base!A:A;base!D:D);"")', 'Conferido ✓'],
        ['Pedro Lima', '17/09/2026', 'R$ 980,50', '=SOMA(C2:C4)', 'Pago ✓']
      ]
    },
    {
      dirty: [
        ['fernanda ROCHA', '20/09/26', 'R$ 3.200', '=#REF!', 'revisar'],
        ['LUCAS mendes', '21-9-26', '775,8', '=#VALOR!', 'duplicado'],
        ['bia santos', '22.09.26', '1.940', '=#N/D', 'sem status']
      ],
      clean: [
        ['Fernanda Rocha', '20/09/2026', 'R$ 3.200,00', '=SOMA(C2:C4)', 'Validado ✓'],
        ['Lucas Mendes', '21/09/2026', 'R$ 775,80', '=SEERRO(PROCX(A3;base!A:A;base!D:D);"")', 'Conferido ✓'],
        ['Bia Santos', '22/09/2026', 'R$ 1.940,00', '=SOMA(C2:C4)', 'Pago ✓']
      ]
    }
  ];

  const colNames = ['client','date','value','formula','status'];
  let scenarioIndex = 0;
  let timers = [];
  let isRunning = false;
  let cycleScheduled = false;

  const clearTimers = () => {
    timers.forEach(timer => clearTimeout(timer));
    timers = [];
    cycleScheduled = false;
  };

  const cellsForColumn = col => [...demo.querySelectorAll(`.automation-demo-sheet tbody [data-demo-col="${col}"]`)];
  const headerForColumn = col => headers.find(header => header.dataset.demoCol === col);

  const clearColumnComplete = () => {
    demo.querySelectorAll('.automation-demo-sheet .is-column-complete').forEach(el => el.classList.remove('is-column-complete'));
  };

  const renderDirtyScenario = scenario => {
    clearColumnComplete();
    chips.forEach(chip => chip.classList.remove('is-done'));
    rows.forEach((row, rowIndex) => {
      [...row.cells].forEach((cell, colIndex) => {
        cell.textContent = scenario.dirty[rowIndex][colIndex];
        cell.classList.remove('ok','demo-updated','is-column-complete');
        cell.classList.add('err');
      });
    });
    state.textContent = 'PROCESSO MANUAL';
    state.classList.remove('state-auto','state-processing');
    state.classList.add('state-manual');
    caption.textContent = 'Cenário ilustrativo · inconsistências identificadas';
  };

  const markColumnComplete = (col, chipIndex) => {
    const header = headerForColumn(col);
    if (header) header.classList.add('is-column-complete');
    cellsForColumn(col).forEach(cell => cell.classList.add('is-column-complete'));
    if (typeof chipIndex === 'number' && chips[chipIndex]) chips[chipIndex].classList.add('is-done');
  };

  const updateColumnSlowly = (scenario, colIndex, startAt, perCellDelay, chipIndex = null) => {
    const col = colNames[colIndex];
    const colCells = cellsForColumn(col);
    colCells.forEach((cell, rowIndex) => {
      timers.push(setTimeout(() => {
        cell.textContent = scenario.clean[rowIndex][colIndex];
        cell.classList.remove('err');
        cell.classList.add('ok','demo-updated');
      }, startAt + rowIndex * perCellDelay));
    });
    const finishAt = startAt + colCells.length * perCellDelay;
    timers.push(setTimeout(() => markColumnComplete(col, chipIndex), finishAt + 260));
    return finishAt + 650;
  };

  const isDemoVisible = () => {
    const rect = demo.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight && document.body.dataset.page === 'automacao';
  };

  const scheduleNextCycle = (delay = 6500) => {
    if (cycleScheduled || reducedMotion.matches) return;
    cycleScheduled = true;
    timers.push(setTimeout(() => {
      cycleScheduled = false;
      if (!isDemoVisible()) {
        scheduleNextCycle(1800);
        return;
      }
      scenarioIndex = (scenarioIndex + 1) % scenarios.length;
      playScenario(scenarioIndex);
    }, delay));
  };

  const playScenario = index => {
    clearTimers();
    const scenario = scenarios[index];
    renderDirtyScenario(scenario);
    isRunning = true;

    // Mantém o estado manual visível antes da rotina começar, para que a
    // transformação seja fácil de acompanhar sem depender de um botão.
    timers.push(setTimeout(() => {
      state.textContent = 'EM PROCESSAMENTO';
      state.classList.remove('state-manual','state-auto');
      state.classList.add('state-processing');
      caption.textContent = 'Lendo a base e iniciando as validações...';
    }, 2400));

    let cursor = 4200;
    cursor = updateColumnSlowly(scenario, 0, cursor, 1250, 0); // Cliente

    cursor += 900;
    cursor = updateColumnSlowly(scenario, 1, cursor, 1150); // Data
    cursor += 650;
    cursor = updateColumnSlowly(scenario, 2, cursor, 1150); // Valor

    cursor += 900;
    timers.push(setTimeout(() => { caption.textContent = 'Corrigindo fórmulas e referências...'; }, Math.max(0, cursor - 550)));
    cursor = updateColumnSlowly(scenario, 3, cursor, 1300, 1); // Fórmula

    cursor += 900;
    timers.push(setTimeout(() => { caption.textContent = 'Validando os status da base...'; }, Math.max(0, cursor - 550)));
    cursor = updateColumnSlowly(scenario, 4, cursor, 1300, 2); // Status

    timers.push(setTimeout(() => {
      chips[3]?.classList.add('is-done');
      state.textContent = 'BASE VALIDADA';
      state.classList.remove('state-manual','state-processing');
      state.classList.add('state-auto');
      caption.textContent = 'Base padronizada · validações concluídas';
      isRunning = false;
      scheduleNextCycle(6500);
    }, cursor + 1100));
  };

  if (reducedMotion.matches) {
    const scenario = scenarios[0];
    renderDirtyScenario(scenario);
    rows.forEach((row, rowIndex) => {
      [...row.cells].forEach((cell, colIndex) => {
        cell.textContent = scenario.clean[rowIndex][colIndex];
        cell.classList.remove('err');
        cell.classList.add('ok','demo-updated','is-column-complete');
      });
    });
    headers.forEach(header => header.classList.add('is-column-complete'));
    chips.forEach(chip => chip.classList.add('is-done'));
    state.textContent = 'BASE VALIDADA';
    state.classList.remove('state-manual','state-processing');
    state.classList.add('state-auto');
    caption.textContent = 'Base padronizada · validações concluídas';
  } else {
    if (restartButton) {
      restartButton.addEventListener('click', () => {
        clearTimers();
        isRunning = false;
        playScenario(scenarioIndex);
      });
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isRunning && !cycleScheduled) {
          timers.push(setTimeout(() => {
            if (isDemoVisible() && !isRunning) playScenario(scenarioIndex);
          }, 1000));
        }
      });
    }, { threshold: .28 });
    observer.observe(demo);
  }
}

initAutomationSheetDemo();


function initAutomationPlanSelector() {
  const cards = [...document.querySelectorAll('#automacao [data-automation-choice]')];
  const cta = document.querySelector('#automation-hero-cta');
  if (!cards.length || !cta) return;

  const selectCard = card => {
    cards.forEach(item => {
      const selected = item === card;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    cta.dataset.plan = card.dataset.automationChoice || '';
    cta.dataset.contactNeed = card.dataset.automationNeed || 'Criar e automatizar uma planilha';
    if (!reducedMotion.matches && typeof card.animate === 'function') {
      card.animate(
        [
          { transform: 'translateY(0) scale(1)' },
          { transform: 'translateY(-1px) scale(1.008)' },
          { transform: 'translateY(0) scale(1)' }
        ],
        { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
    }
  };

  cards.forEach(card => {
    card.addEventListener('click', () => selectCard(card));
    card.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectCard(card);
    });
  });

  cards.forEach(card => {
    card.classList.remove('is-selected');
    card.setAttribute('aria-pressed', 'false');
  });
  cta.dataset.plan = '';
  cta.dataset.contactNeed = 'Criar e automatizar uma planilha';
}

initAutomationPlanSelector();

// REV37 — seções informativas recolhíveis somente em celulares.
function initMobileSectionToggles(){
  const mobileQuery=window.matchMedia('(max-width: 760px)');
  const toggles=[...document.querySelectorAll('[data-mobile-toggle]')];
  if(!toggles.length)return;
  const getTarget=toggle=>document.getElementById(toggle.dataset.mobileToggle||'');
  const sync=()=>{
    toggles.forEach(toggle=>{
      const target=getTarget(toggle);
      if(!target)return;
      toggle.hidden=!mobileQuery.matches;
      if(!mobileQuery.matches){
        target.classList.remove('is-mobile-open');
        toggle.setAttribute('aria-expanded','false');
        const icon=toggle.querySelector('i[aria-hidden="true"]');
        if(icon)icon.textContent='↓';
      }
    });
  };
  const setOpen=(toggle,open,{scroll=false}={})=>{
    const target=getTarget(toggle);
    if(!target)return;
    target.classList.toggle('is-mobile-open',open);
    toggle.setAttribute('aria-expanded',String(open));
    const icon=toggle.querySelector('i[aria-hidden="true"]');
    if(icon)icon.textContent=open?'↑':'↓';
    if(open&&scroll){
      requestAnimationFrame(()=>target.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth',block:'start'}));
    }
  };
  toggles.forEach(toggle=>toggle.addEventListener('click',()=>{
    if(!mobileQuery.matches)return;
    setOpen(toggle,toggle.getAttribute('aria-expanded')!=='true');
  }));
  // Se um atalho aponta para uma seção recolhida, abre antes de rolar.
  document.addEventListener('click',event=>{
    if(!mobileQuery.matches)return;
    const link=event.target.closest('[data-scroll-target]');
    if(!link)return;
    const id=link.dataset.scrollTarget;
    const toggle=toggles.find(item=>item.dataset.mobileToggle===id);
    if(toggle)setOpen(toggle,true);
  },true);
  const openHashTarget=()=>{
    if(!mobileQuery.matches||!location.hash)return;
    const id=location.hash.slice(1);
    const toggle=toggles.find(item=>item.dataset.mobileToggle===id);
    if(toggle)setOpen(toggle,true);
  };
  openHashTarget();
  window.addEventListener('hashchange',openHashTarget);
  if(typeof mobileQuery.addEventListener==='function')mobileQuery.addEventListener('change',sync);
  else if(typeof mobileQuery.addListener==='function')mobileQuery.addListener(sync);
  sync();
}
initMobileSectionToggles();

// REV51 — scroll reveal verdadeiro: elementos ficam ocultos até entrarem no viewport.
function initPlannexMotionSystem(){
  if (reducedMotion.matches || typeof IntersectionObserver !== 'function') return;

  const registered = new WeakSet();
  const animated = new WeakSet();

  const motionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const element = entry.target;
      if (!entry.isIntersecting || animated.has(element)) return;

      animated.add(element);
      motionObserver.unobserve(element);

      const delay = Number(element.dataset.motionDelay || 0);
      const duration = Number(element.dataset.motionDuration || 620);
      const easing = 'cubic-bezier(.2,.75,.2,1)';

      // O estado inicial já foi aplicado no momento do registro. Ao entrar
      // no viewport, fazemos uma única transição até o estado final.
      element.style.transition = [
        `opacity ${duration}ms ${easing} ${delay}ms`,
        `translate ${duration}ms ${easing} ${delay}ms`,
        `scale ${duration}ms ${easing} ${delay}ms`
      ].join(',');

      requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.translate = '0 0';
        element.style.scale = '1';
      });

      const total = delay + duration + 120;
      window.setTimeout(() => {
        element.style.transition = '';
        element.style.willChange = '';
        element.style.translate = '';
        element.style.scale = '';
        element.style.opacity = '1';
        element.dataset.motionState = 'revealed';
      }, total);

      // Preços recebem apenas um pequeno acabamento depois da entrada.
      if (element.matches('.hero-price-value strong,.price .plan-price-main,.automation-preview-price strong')) {
        window.setTimeout(() => {
          if (!element.animate) return;
          const pop = element.animate(
            [{transform:'scale(1)'},{transform:'scale(1.018)'},{transform:'scale(1)'}],
            {duration:360,easing:'cubic-bezier(.2,.8,.2,1)'}
          );
          motionJobs.add(pop);
          pop.onfinish = pop.oncancel = () => motionJobs.delete(pop);
        }, delay + duration - 40);
      }
    });
  }, {threshold:.12,rootMargin:'0px 0px -10% 0px'});

  const register = (element, axis='y', delay=0, scale=false, distance=22, duration=620) => {
    if (!element || registered.has(element)) return;
    registered.add(element);

    element.dataset.motionAxis = axis;
    element.dataset.motionDelay = String(delay);
    element.dataset.motionDistance = String(distance);
    element.dataset.motionDuration = String(duration);
    if (scale) element.dataset.motionScale = 'true';

    const x = axis === 'left' ? -distance : axis === 'right' ? distance : 0;
    const y = axis === 'up' ? distance : axis === 'down' ? -distance : axis === 'y' ? distance : 0;

    // Crucial: o elemento já nasce no estado oculto ANTES de ser observado.
    // Assim ele não aparece pronto e depois "refaz" a animação.
    element.dataset.motionState = 'pending';
    element.style.opacity = '0';
    element.style.translate = `${x}px ${y}px`;
    element.style.scale = scale ? '.985' : '1';
    element.style.willChange = 'opacity, translate, scale';

    motionObserver.observe(element);
  };

  const registerStaggered = (elements, axes=['y'], start=0, step=70, scale=false) => {
    [...elements].forEach((element,index) => register(element,axes[index % axes.length],start + Math.min(index,6)*step,scale));
  };

  const registerPage = page => {
    if (!page) return;

    // Primeira dobra: copy vem da esquerda; demonstração/apoio vem da direita.
    register(page.querySelector(':scope > .hero-copy'), 'left', 20, false, 26, 680);
    const directHeroCompanion = [...page.children].find(child =>
      child !== page.querySelector(':scope > .hero-copy') &&
      (child.classList.contains('simulation') || child.classList.contains('automation-overview') || child.classList.contains('contact-grid'))
    );
    register(directHeroCompanion, 'right', 90, true, 24, 700);

    // Títulos e blocos editoriais.
    page.querySelectorAll('.section-heading,.home-calc-intro,.automation-services>.center,.automation-plans>.center').forEach((el,index) => {
      register(el,index % 2 ? 'right' : 'left',20,false,20,600);
    });

    // Componentes principais entram em direções alternadas.
    registerStaggered(page.querySelectorAll('.calculation-scope-item'),['left','right'],20,75,true);
    registerStaggered(page.querySelectorAll('.calc-price-card'),['left','right'],20,100,true,24,650);
    registerStaggered(page.querySelectorAll('.editorial-delivery-checks>li'),['up'],60,85,true);
    registerStaggered(page.querySelectorAll('.delivery-security'),['left','right'],40,90,false);
    register(page.querySelector('.memory-example'),'up',30,true,18,620);
    register(page.querySelector('.home-process-compact'),'up',40,true,18,620);
    register(page.querySelector('.secondary-compact'),'right',40,true,22,650);

    registerStaggered(page.querySelectorAll('.automation-preview-card'),['left','right'],20,100,true);
    register(page.querySelector('.automation-overview'),'right',60,true,24,660);
    register(page.querySelector('.automation-demo-panel'),'left',30,true,22,660);
    registerStaggered(page.querySelectorAll('.solutions>article'),['left','up','right'],30,70,true);
    registerStaggered(page.querySelectorAll('.support-plans-two>.plan'),['left','right'],30,110,true);

    register(page.querySelector('.contact-request-panel'),'left',20,true,22,650);
    register(page.querySelector('.contact-aside'),'right',80,true,22,650);

    // Pequenos elementos recebem apenas movimento vertical curto.
    registerStaggered(page.querySelectorAll('.home-process-steps>li,.automation-path-step,.automation-snapshot>li'),['up'],20,60,false);
    registerStaggered(page.querySelectorAll('.hero-price-value strong,.price .plan-price-main,.automation-preview-price strong'),['up'],80,45,true,12,520);
  };

  pages.forEach(registerPage);
  document.querySelectorAll('.footer-brand-block,.footer-column').forEach((el,index) => register(el,index===0?'left':'right',index*55,true,18,600));

  // Ao mudar de página, registra qualquer conteúdo que possa ter sido criado/alterado dinamicamente.
  const previousPageChange = onPageChange;
  onPageChange = () => {
    previousPageChange();
    requestAnimationFrame(() => registerPage(document.querySelector('.page.is-active')));
  };

  // Abertura de FAQs: conteúdo surge de forma curta e previsível.
  document.querySelectorAll('details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      const content = details.querySelector('p,div:not(summary)');
      if (!content || !content.animate) return;
      content.animate(
        [{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}],
        {duration:280,easing:'cubic-bezier(.22,.61,.36,1)'}
      );
    });
  });

  // Quando um bloco mobile é reaberto, ele reaparece sem um corte seco.
  document.querySelectorAll('.mobile-section-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      requestAnimationFrame(() => {
        const target = document.getElementById(toggle.dataset.mobileToggle || '');
        if (!target || !target.classList.contains('is-mobile-open') || !target.animate) return;
        target.animate(
          [{opacity:.25,transform:'translateY(-10px)'},{opacity:1,transform:'translateY(0)'}],
          {duration:360,easing:'cubic-bezier(.22,.61,.36,1)'}
        );
      });
    });
  });
}

initPlannexMotionSystem();

// REV59 — feedback explícito de seleção no contato e microinteração da promoção.
function initExplicitSelectionFeedback(){
  const pulse = (element, className, timeout = 520) => {
    if (!element || reducedMotion.matches) return;
    element.classList.remove(className);
    // Reinicia a animação mesmo quando o usuário clica novamente no item já ativo.
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), timeout);
  };

  document.querySelectorAll('[data-contact-area-choice]').forEach(choice => {
    choice.addEventListener('click', () => pulse(choice, 'is-choice-pulse', 480));
    choice.addEventListener('keydown', event => {
      if (!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(event.key)) return;
      requestAnimationFrame(() => {
        const active = document.querySelector('[data-contact-area-choice][aria-checked=\"true\"]');
        pulse(active, 'is-choice-pulse', 480);
      });
    });
  });

  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('click', event => {
      const option = event.target.closest('.contact-interest-option');
      if (!option || !contactForm.contains(option)) return;
      if (option.getAttribute('aria-pressed') === 'true') {
        pulse(option, 'is-choice-pulse', 620);
      }
    });
  }

  document.querySelectorAll('.hero-price-preview.is-promotional').forEach(promo => {
    promo.addEventListener('click', () => pulse(promo, 'is-promo-feedback', 560));
  });
}

initExplicitSelectionFeedback();


// REV86 — movimento de entrada consistente em todo o site ao rolar a página.
function initGlobalScrollReveal() {
  if (reducedMotion.matches || !('IntersectionObserver' in window) || typeof Element.prototype.animate !== 'function') return;

  const selectors = [
    '.page > *:not(.mobile-section-toggle)',
    '#inicio .home-extra > *:not(.section-divider):not(.mobile-section-toggle)',
    '#inicio .calculation-scope-items > *',
    '#inicio .single-offer > article',
    '#inicio .editorial-delivery-checks > li',
    '#inicio .delivery-security-list > *',
    '#inicio .home-process-steps > li',
    '#inicio .secondary-mini-ui-row',
    '#automacao .automation-path > article',
    '#automacao .automation-snapshot > li',
    '#automacao .solutions > article',
    '#automacao .support-plans > article',
    '#contato .contact-grid > *',
    '.site-footer .footer-grid > *',
    '.site-footer .footer-bottom'
  ];

  const items = [...new Set(selectors.flatMap(selector => [...document.querySelectorAll(selector)]))]
    .filter(element => !element.matches('[hidden], .section-divider, script, style'));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      observer.unobserve(element);
      if (element.dataset.scrollRevealDone === 'true') return;
      element.dataset.scrollRevealDone = 'true';

      const group = element.parentElement ? [...element.parentElement.children].filter(child => items.includes(child)) : [];
      const localIndex = Math.max(0, group.indexOf(element));
      const delay = Math.min(localIndex, 3) * 65;
      const distance = element.matches('.editorial-delivery, .content-block, .automation-overview, .contact-request-layout') ? 26 : 18;

      const animation = element.animate(
        [
          { opacity: 0, transform: `translate3d(0, ${distance}px, 0)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' }
        ],
        {
          duration: 620,
          delay,
          easing: 'cubic-bezier(.2,.72,.2,1)',
          fill: 'backwards'
        }
      );
      motionJobs.add(animation);
      animation.onfinish = animation.oncancel = () => motionJobs.delete(animation);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

  items.forEach(element => observer.observe(element));
}

initGlobalScrollReveal();


// REV98 — exemplos visuais permanecem dentro das áreas de texto até o usuário escrever.
(() => {
  const syncTextareaShell = (textarea) => {
    const shell = textarea?.closest('.contact-textarea-shell');
    if (!shell) return;
    shell.classList.toggle('has-value', Boolean(textarea.value.trim()));
  };
  ['contact-description','contact-notes'].forEach((id) => {
    const textarea = document.getElementById(id);
    if (!textarea) return;
    syncTextareaShell(textarea);
    textarea.addEventListener('input', () => syncTextareaShell(textarea));
    textarea.addEventListener('change', () => syncTextareaShell(textarea));
  });

  const deadline = document.getElementById('contact-deadline');
  if (deadline) {
    const syncDeadline = () => deadline.classList.toggle('has-value', Boolean(deadline.value));
    syncDeadline();
    deadline.addEventListener('input', syncDeadline);
    deadline.addEventListener('change', syncDeadline);
  }
})();
