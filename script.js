'use strict';
// Configure apenas com os canais comerciais confirmados. Sem configuração, não há envio.
const WHATSAPP_NUMBER = '';
const CONTACT_EMAIL = '';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pages = $$('.page');
const pageIds = pages.map(page => page.id);
const frameJobs = new Map();
const motionJobs = new Set();
let onPageChange = () => {};

function animateNumber(element, from, to, format, duration = 750) {
  const previous = frameJobs.get(element);
  if (previous) cancelAnimationFrame(previous.frame);
  if (reducedMotion.matches) { element.textContent = format(to); frameJobs.delete(element); return; }
  const job = { frame: 0, finish: () => { element.textContent = format(to); } };
  const start = performance.now();
  function draw(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
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

function showPage(id, focus = false) {
  const targetId = pageIds.includes(id) ? id : 'inicio';
  const oldId = document.body.dataset.page;
  pages.forEach(page => page.classList.toggle('is-active', page.id === targetId));
  $$('header nav a').forEach(link => {
    const active = link.hash === '#' + targetId;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.body.dataset.page = targetId;
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (focus) {
    const title = $('#' + targetId).querySelector('h1,h2');
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
  }
  if (oldId && oldId !== targetId) reveal($('#' + targetId), 0);
  onPageChange();
  updateReadingProgress();
}
function navigate(id, focus = true) {
  if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  showPage(id, focus);
}
$$('a[href^="#"]').forEach(link => {
  const id = link.getAttribute('href').slice(1);
  if (!pageIds.includes(id)) return;
  link.addEventListener('click', event => { event.preventDefault(); navigate(id); });
});
window.addEventListener('popstate', () => {
  const id = location.hash.slice(1);
  if (pageIds.includes(id) || !id) showPage(id, true);
});
$('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  $('#conteudo').focus({ preventScroll: true });
  $('#conteudo').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
});
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (pageIds.includes(id) || !id) showPage(id, true);
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
showPage(location.hash.slice(1));

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
const form = $('#contact-form');
const submitButton = form.querySelector('button[type="submit"]');
const planPicker = $('#contact-plan-picker');
const planLock = $('#plan-picker-lock');
const planRadios = $$('input[name="plano"]');
const selectedPlanNotice = $('#selected-plan-notice');

function getSelectedPlan() {
  return planRadios.find(radio => radio.checked)?.value || '';
}

function updatePlanState({ announce = false } = {}) {
  const selectedPlan = getSelectedPlan();
  const hasPlan = Boolean(selectedPlan);
  planPicker.classList.toggle('has-selection', hasPlan);
  planPicker.classList.remove('needs-attention');
  submitButton.disabled = !hasPlan;
  submitButton.setAttribute('aria-disabled', String(!hasPlan));
  planLock.textContent = hasPlan
    ? `Plano ${selectedPlan} selecionado. O envio está liberado.`
    : 'Selecione um plano acima para liberar o envio.';
  selectedPlanNotice.hidden = !hasPlan;
  if (hasPlan) selectedPlanNotice.textContent = `Plano de interesse: ${selectedPlan}`;
  if (announce && hasPlan) selectedPlanNotice.focus?.({ preventScroll: true });
}

function selectContactPlan(plan) {
  const radio = planRadios.find(item => item.value === plan);
  if (!radio) return false;
  radio.checked = true;
  updatePlanState();
  return true;
}

planRadios.forEach(radio => radio.addEventListener('change', () => updatePlanState()));
updatePlanState();

$('#whatsapp').addEventListener('click', () => {
  if (WHATSAPP_NUMBER) {
    const selectedPlan = getSelectedPlan();
    const planText = selectedPlan ? ` Tenho interesse no plano ${selectedPlan}.` : '';
    const message = 'Olá! Tenho uma planilha/processo que gostaria de automatizar e quero entender o que pode ser melhorado.' + planText;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  } else {
    $('#selected-plan').textContent = getSelectedPlan() ? `Plano selecionado: ${getSelectedPlan()}` : '';
    dialog.showModal();
  }
});
$$('.close, #close-dialog').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

$$('[data-plan]').forEach(button => button.addEventListener('click', () => {
  selectContactPlan(button.dataset.plan);
  $('#cf-need').value = 'Contratar suporte recorrente';
  navigate('contato', false);
  requestAnimationFrame(() => $('#cf-name').focus({ preventScroll: true }));
}));

form.addEventListener('submit', async event => {
  event.preventDefault();
  const selectedPlan = getSelectedPlan();
  const status = $('#form-status');
  if (!selectedPlan) {
    planPicker.classList.remove('needs-attention');
    void planPicker.offsetWidth;
    planPicker.classList.add('needs-attention');
    planLock.textContent = 'Escolha um plano antes de enviar a solicitação.';
    status.textContent = 'Para continuar, selecione um plano.';
    planPicker.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
    planRadios[0]?.focus({ preventScroll: true });
    return;
  }
  if (!form.reportValidity()) return;
  if (!CONTACT_EMAIL) {
    status.textContent = 'O envio ainda não está disponível. Nenhum dado foi enviado.';
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = 'Enviando análise…';
  status.textContent = `Enviando seu pedido de análise com o plano ${selectedPlan}…`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    // FormSubmit requires activation of the configured business e-mail.
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form), signal: controller.signal });
    const result = await response.json();
    if (!response.ok || (result.success !== true && result.success !== 'true')) throw new Error('Envio não confirmado');
    status.textContent = 'Pedido de análise recebido. Entraremos em contato para entender a rotina e combinar os próximos passos.';
    form.reset();
    updatePlanState();
  } catch {
    status.textContent = 'Não foi possível enviar agora. Seus campos foram preservados para tentar novamente.';
  } finally {
    clearTimeout(timeout);
    submitButton.textContent = 'Solicitar análise';
    submitButton.disabled = !getSelectedPlan();
    submitButton.setAttribute('aria-disabled', String(submitButton.disabled));
  }
});

// Three different automations, one consistent workbook interface.
const demoApi = window.PLANEX_DEMOS;
const simulation = $('.simulation');
let demoId = 'sales', model, actions = [], cursor = 0, timer = 0, cycleTimer = 0;
let running = false, paused = false, demoVisible = true, autoStarted = false;
const AUTO_SWITCH_DELAY = 2400;
function visible() { return demoVisible && document.body.dataset.page === 'inicio' && !document.hidden; }
function stage(index) {
  $$('[data-demo-step]').forEach((step, i) => {
    step.classList.toggle('is-current', i === index);
    step.classList.toggle('is-done', i < index);
  });
}
function renderTable() {
  const head = $('#demo-head'); head.replaceChildren();
  const row = document.createElement('tr');
  model.columns.forEach(label => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; row.append(th); });
  head.append(row);
  const body = $('#demo-body'); body.replaceChildren();
  model.rows.forEach(item => {
    const tr = document.createElement('tr');
    item.initial.forEach((value, index) => { const cell = document.createElement(index === 0 ? 'th' : 'td'); if (index === 0) cell.scope = 'row'; cell.textContent = value; tr.append(cell); });
    body.append(tr);
  });
}
function resetDemo(id) {
  clearTimeout(timer);
  clearTimeout(cycleTimer);
  cancelNumber($('#report-total'));
  demoId = id; model = demoApi.getDemo(id); cursor = 0; actions = []; running = false; paused = false;
  simulation.dataset.mode = id;
  simulation.classList.remove('is-complete');
  $$('[data-demo]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demo === id)));
  $('#workbook-name').textContent = model.name;
  $('#demo-sheet-name').textContent = model.sheet;
  $('#demo-caption').textContent = model.sheet + '. Dados fictícios.';
  $('#report-label').textContent = model.label;
  $('#report-total').textContent = model.format(0);
  $('#report-detail').textContent = 'Aguardando processamento';
  $('#cell-address').textContent = 'A1';
  $('#formula-value').textContent = model.intro;
  $('#simulation-status').textContent = model.intro;
  $('#workbook-state').textContent = 'Pronto';
  $('#demo-run').textContent = 'Reproduzir';
  $('.demo-chart').setAttribute('aria-label', 'Indicadores ainda não calculados.');
  model.chart.forEach((item, i) => { $('#bar-label-' + i).textContent = item.label; $('#bar-' + i).style.transform = 'scaleX(0)'; });
  renderTable();stage(-1);controls();
}
function processRow(index) {
  const rows = [...$('#demo-body').children];
  rows.forEach(row => row.classList.remove('processing-row'));
  const row = rows[index];
  model.rows[index].result.forEach((value, i) => { row.children[i].textContent = value; });
  row.classList.add('processing-row');
  row.lastElementChild.classList.add('result-ready');
  $('#cell-address').textContent = `A${index + 2}:D${index + 2}`;
  $('#formula-value').textContent = model.rows[index].formula;
}
function report() {
  $('#demo-body').querySelectorAll('.processing-row').forEach(row => row.classList.remove('processing-row'));
  animateNumber($('#report-total'), 0, model.value, model.format);
  $('#report-detail').textContent = model.detail;
  const max = Math.max(...model.chart.map(item => item.value), 1);
  model.chart.forEach((item, i) => { $('#bar-' + i).style.transform = `scaleX(${item.value / max})`; });
  $('.demo-chart').setAttribute('aria-label', model.chart.map(item => item.label + ': ' + (demoId === 'clean' ? item.value + ' registros' : model.format(item.value))).join('; '));
}
function controls() {
  const progress = actions.length ? cursor / actions.length : 0;
  $('.simulation-progress').setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  $('.simulation-progress > span').style.transform = `scaleX(${progress})`;
  $('#demo-pause').disabled = !running || reducedMotion.matches;
  $('#demo-pause').textContent = paused ? 'Continuar' : 'Pausar';
  simulation.classList.toggle('is-paused', paused);
  simulation.setAttribute('aria-busy', String(running && !paused));
}
function finish() {
  running = false;stage(3);controls();
  simulation.classList.add('is-complete');
  $('#workbook-state').textContent = 'Atualizado';
  $('#simulation-status').textContent = model.done + ' A próxima demonstração começa automaticamente.';
  $('#demo-run').textContent = 'Reproduzir novamente';
  clearTimeout(cycleTimer);
  if (!reducedMotion.matches && visible()) {
    cycleTimer = setTimeout(() => {
      demoId = demoApi.ids[(demoApi.ids.indexOf(demoId) + 1) % demoApi.ids.length];
      runDemo();
    }, AUTO_SWITCH_DELAY);
  }
}
function tick() {
  clearTimeout(timer);
  if (!running || paused || !visible()) return;
  if (cursor < actions.length) actions[cursor++]();
  controls();
  if (cursor >= actions.length) finish();
  else timer = setTimeout(tick, 1100);
}
function runDemo() {
  autoStarted = true;
  resetDemo(demoId);
  actions = [
    () => { stage(0); $('#workbook-state').textContent = 'Carregando'; $('#simulation-status').textContent = model.messages[0]; },
    () => { stage(1); $('#workbook-state').textContent = 'Processando'; $('#simulation-status').textContent = model.messages[1]; },
    ...model.rows.map((_, index) => () => processRow(index)),
    () => { stage(2); $('#simulation-status').textContent = model.messages[2]; report(); }
  ];
  running = true;
  $('#demo-run').textContent = 'Reiniciar';
  if (reducedMotion.matches) {
    while (cursor < actions.length) actions[cursor++]();
    finish();
  } else tick();
}
$('#demo-run').addEventListener('click', runDemo);
$('#demo-pause').addEventListener('click', () => {
  paused = !paused;clearTimeout(timer);
  $('#simulation-status').textContent = paused ? 'Demonstração pausada. Continue quando quiser.' : model.messages[Math.min(2, cursor > 4 ? 2 : 1)];
  $('#workbook-state').textContent = paused ? 'Pausado' : 'Processando';
  controls();
  if (!paused) timer = setTimeout(tick, 350);
});
$$('[data-demo]').forEach(button => button.addEventListener('click', () => { demoId = button.dataset.demo; runDemo(); }));
$('#demo-next').addEventListener('click', () => { demoId = demoApi.ids[(demoApi.ids.indexOf(demoId) + 1) % demoApi.ids.length]; runDemo(); });
function syncDemo() {
  clearTimeout(timer);
  clearTimeout(cycleTimer);
  if (!visible()) return;
  if (!autoStarted) runDemo();
  else if (running && !paused) timer = setTimeout(tick, 250);
  else if (!running && !paused && !reducedMotion.matches) {
    cycleTimer = setTimeout(() => {
      demoId = demoApi.ids[(demoApi.ids.indexOf(demoId) + 1) % demoApi.ids.length];
      runDemo();
    }, 900);
  }
}
onPageChange = syncDemo;
document.addEventListener('visibilitychange', syncDemo);
resetDemo('sales');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => { demoVisible = entries[0].isIntersecting; syncDemo(); }, { threshold: 0.1 });
  observer.observe(simulation);
} else syncDemo();

// Entrance reveals and counters execute once; text stays readable without JavaScript.
const counterFormat = value => Math.round(value).toLocaleString('pt-BR');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
      observer.unobserve(entry.target);
      if (entry.target.hasAttribute('data-count')) {
        animateNumber(entry.target, 0, Number(entry.target.dataset.count), counterFormat, 1100);
      } else reveal(entry.target, Math.min(index, 3) * 70);
    });
  }, { threshold: 0.14 });
  $$('.hero-copy > *, .section-heading, .pain-grid article, .solutions article, .plan, .transform-panel, .benefits-grid article, .about-grid > p, .process-list li, .contact-trust-list li, [data-count]').forEach(element => observer.observe(element));
}
$$('.faq details').forEach(detail => detail.addEventListener('toggle', () => { if (detail.open) reveal(detail.querySelector('p')); updateReadingProgress(); }));
reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) return;
  motionJobs.forEach(animation => animation.cancel());
  frameJobs.forEach(job => { cancelAnimationFrame(job.frame); job.finish(); });
  frameJobs.clear();
  clearTimeout(cycleTimer);
  if (running) { clearTimeout(timer); while (cursor < actions.length) actions[cursor++](); finish(); }
});
