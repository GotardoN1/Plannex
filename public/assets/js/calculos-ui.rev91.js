/* Laboratório visual de cálculos: todos os valores, fatores e textos são estritamente demonstrativos. */
(() => {
  'use strict';

  const card = document.querySelector('#calculation-simulation');
  const tech = document.querySelector('.tech-preview');
  if (!card) return;

  const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const monthLabels = ['Jan/2025','Fev/2025','Mar/2025','Abr/2025','Mai/2025','Jun/2025','Jul/2025','Ago/2025'];
  const modes = [
    {
      key: 'update',
      name: 'Atualização',
      file: 'memoria_atualizacao.xlsx',
      sheet: 'Memória de cálculo',
      mainCol: 'Parcela',
      cols: ['Competência','Antes','Atualizado'],
      label: 'VALOR ATUALIZADO',
      statuses: [
        'Organizando documentos, parcelas e períodos do exemplo.',
        'Aplicando os critérios ilustrativos do cálculo.',
        'Revisando a memória e os valores apurados.',
        'Memória de cálculo demonstrativa concluída.'
      ]
    },
    {
      key: 'check',
      name: 'Conferência',
      file: 'conferencia_exemplo.xlsx',
      sheet: 'Conferência',
      mainCol: 'Parcela',
      cols: ['Apresentado','Conferido','Diferença'],
      label: 'VALOR CONFERIDO',
      statuses: [
        'Organizando os valores apresentados para conferência.',
        'Recalculando as parcelas com os critérios ilustrativos.',
        'Comparando o valor apresentado com o valor conferido.',
        'Conferência demonstrativa concluída.'
      ]
    },
    {
      key: 'report',
      name: 'Parecer',
      file: 'parecer_tecnico_exemplo.docx',
      sheet: 'Parecer técnico · exemplo',
      mainCol: 'Seção',
      cols: ['Conteúdo','Status','Página'],
      label: 'CONCLUSÃO TÉCNICA',
      statuses: [
        'Organizando a base e a metodologia do parecer demonstrativo.',
        'Registrando critérios, valores e pontos da conferência.',
        'Redigindo a análise e a conclusão técnica ilustrativa.',
        'Parecer técnico demonstrativo concluído.'
      ]
    }
  ];

  let mode = 0;
  let step = 0;
  let rows = [];
  let timer = 0;
  let reportTimer = 0;
  let paused = false;
  let inView = false;
  let techVisible = false;
  let reportExampleIndex = -1;
  let lastReportTypedStep = -1;

  const reportExamples = [
    'Foram identificados os documentos e critérios utilizados no exemplo. A memória organiza os valores apurados e o parecer registra a metodologia, a conferência e a conclusão técnica.',
    'A análise ilustrativa parte dos dados e parâmetros definidos para o caso. Os valores são recalculados, as diferenças são conferidas e a conclusão registra o resultado apurado.',
    'O parecer demonstrativo reúne a base analisada, a metodologia empregada, os critérios de atualização e a conclusão do cálculo de forma objetiva e rastreável.'
  ];

  const REPORT_TYPE_INTERVAL = 38;
  const REPORT_STATIC_HOLD = 5000;
  const REPORT_TYPING_STEPS = new Set([0, 3, 6]);

  const totalEl = card.querySelector('#calc-report-total');
  const statusEl = card.querySelector('#jc-status');
  const reportTextEl = card.querySelector('#calc-report-text');
  const progressEl = card.querySelector('.calc-simulation-progress');

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function generate() {
    const start = randomInt(0, monthLabels.length - 4);
    rows = Array.from({ length: 3 }, (_, i) => {
      const base = randomInt(1800, 9200) * 100;
      const months = randomInt(3, 10);
      const factor = 1 + randomInt(18, 62) / 1000;
      const corrected = Math.round(base * factor);
      const interest = Math.round(corrected * (randomInt(35, 75) / 10000) * months);
      let result = corrected + interest;
      if (mode === 1) {
        const variation = randomInt(-34, 42) / 1000;
        result = Math.round(base * (1 + variation));
      }
      return {
        label: `Parcela 0${i + 1}`,
        period: monthLabels[start + i],
        base,
        months,
        result
      };
    });
  }

  function totals() {
    const base = rows.reduce((sum, row) => sum + row.base, 0);
    const result = rows.reduce((sum, row) => sum + row.result, 0);
    return { base, result, difference: result - base };
  }

  function finalReport() {
    const t = totals();
    if (mode === 0) {
      return `A memória demonstrativa reúne três parcelas históricas. Após a aplicação dos critérios fictícios e da conferência, o total ilustrativo passa de ${money(t.base)} para ${money(t.result)}.`;
    }
    if (mode === 1) {
      const direction = t.difference >= 0 ? 'acima' : 'abaixo';
      return `Na conferência ilustrativa, o valor recalculado corresponde a ${money(t.result)}, ficando ${money(Math.abs(t.difference))} ${direction} do total originalmente apresentado no exemplo.`;
    }
    if (reportExampleIndex < 0) reportExampleIndex = 0;
    return reportExamples[reportExampleIndex];
  }

  function pickReportExample() {
    if (reportExamples.length < 2) {
      reportExampleIndex = 0;
      return reportExamples[0];
    }
    let next = reportExampleIndex;
    while (next === reportExampleIndex) next = randomInt(0, reportExamples.length - 1);
    reportExampleIndex = next;
    return reportExamples[next];
  }

  function typeReport(text) {
    clearInterval(reportTimer);
    reportTextEl.textContent = '';
    reportTextEl.classList.add('is-typing');
    if (reducedMotion.matches) {
      reportTextEl.textContent = text;
      reportTextEl.classList.remove('is-typing');
      return;
    }
    let index = 0;
    reportTimer = setInterval(() => {
      reportTextEl.textContent = text.slice(0, ++index);
      if (index >= text.length) {
        clearInterval(reportTimer);
        reportTextEl.classList.remove('is-typing');
      }
    }, REPORT_TYPE_INTERVAL);
  }

  function renderRows() {
    if (mode === 2) return;
    const body = card.querySelector('#calc-demo-body');
    const dataset = rows.map((row, i) => {
      const done = step > i + 1;
      const processing = step === i + 2;
      const resultVisible = done || processing;
      return {
        values: mode === 1
          ? [row.label, money(row.base), resultVisible ? money(row.result) : '—', resultVisible ? `${row.result - row.base >= 0 ? '+' : '−'} ${money(Math.abs(row.result - row.base))}` : '—']
          : [row.label, row.period, money(row.base), resultVisible ? money(row.result) : '—'],
        done,
        processing
      };
    });

    body.replaceChildren(...dataset.map(({ values, done, processing }) => {
      const tr = document.createElement('tr');
      if (processing) tr.classList.add('processing-row');
      if (done) tr.classList.add('calc-row-ready');
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? 'th' : 'td');
        if (index === 0) cell.scope = 'row';
        cell.textContent = value;
        if (index === values.length - 1 && (done || processing)) cell.classList.add('result-ready');
        tr.append(cell);
      });
      return tr;
    }));
  }

  function stage() {
    let active = 0;
    if (step >= 2 && step <= 4) active = 1;
    if (step >= 5) active = 2;
    card.querySelectorAll('[data-jc-step]').forEach((el, i) => {
      el.classList.toggle('is-current', i === active && step < 6);
      el.classList.toggle('is-done', i < active || step >= 6);
    });
  }

  function paint() {
    const model = modes[mode];
    const t = totals();
    renderRows();

    card.dataset.mode = model.key;
    card.querySelectorAll('[data-calc-mode]').forEach((button, i) => button.setAttribute('aria-pressed', String(i === mode)));
    card.querySelector('#calc-workbook-name').textContent = model.file;
    card.querySelector('#calc-workbook-state').textContent = step >= 6 ? 'Concluído' : step === 0 ? 'Preparando' : mode === 2 ? 'Redigindo' : `Processando ${Math.min(step, 5)}/5`;
    card.querySelector('.calc-symbol').textContent = mode === 2 ? 'W' : 'Σ';
    card.querySelector('#calc-sheet-name').textContent = model.sheet;
    card.querySelector('#calc-col-main').textContent = model.mainCol;
    card.querySelector('#calc-col-period').textContent = model.cols[0];
    card.querySelector('#calc-col-before').textContent = model.cols[1];
    card.querySelector('#calc-col-after').textContent = model.cols[2];
    card.querySelector('#calc-report-label').textContent = model.label;
    card.querySelector('#calc-toolbar-symbol').textContent = mode === 2 ? 'Aa' : 'ƒx';

    const pipelineLabels = mode === 2
      ? [
          ['Análise técnica', 'Objeto e critérios organizados'],
          ['Redação do parecer', 'Conferência descrita no documento'],
          ['Conclusão', 'Resultado técnico apresentado']
        ]
      : mode === 1
        ? [
            ['Valores apresentados', 'Parcelas preparadas para conferência'],
            ['Revisão', 'Comparação entre valores'],
            ['Diferença apurada', 'Resultado da conferência']
          ]
        : [
            ['Base da demanda', 'Documentos, datas e valores'],
            ['Metodologia', 'Índices, juros e critérios'],
            ['Resultado revisado', 'Memória consolidada']
          ];
    card.querySelectorAll('[data-jc-step]').forEach((item, i) => {
      const strong = item.querySelector('strong');
      const small = item.querySelector('small');
      if (strong) strong.textContent = pipelineLabels[i][0];
      if (small) small.textContent = pipelineLabels[i][1];
    });

    const displayedTotal = step >= 5 ? t.result : t.base;
    const from = Number(totalEl.dataset.cents) || t.base;
    animateNumber(totalEl, from, displayedTotal, money, 900);
    totalEl.dataset.cents = String(displayedTotal);

    const difference = t.difference;
    if (step >= 5) {
      const prefix = mode === 1 ? 'Diferença demonstrativa' : 'Variação ilustrativa';
      card.querySelector('#calc-report-detail').textContent = `${prefix}: ${difference >= 0 ? '+' : '−'} ${money(Math.abs(difference))}`;
    } else {
      card.querySelector('#calc-report-detail').textContent = 'Aguardando conclusão da simulação';
    }

    const formulaMessages = mode === 2 ? [
      'Abrindo a estrutura do parecer técnico demonstrativo.',
      'Organizando o objeto da análise e os valores conferidos.',
      'Redigindo as considerações técnicas do exemplo.',
      'Registrando a metodologia de conferência e atualização.',
      'Consolidando o valor apurado e a conclusão técnica.',
      'Revisando o parecer técnico demonstrativo.',
      'Parecer técnico demonstrativo concluído.'
    ] : [
      'Organizando as parcelas e as competências do exemplo.',
      'Lendo os valores históricos.',
      `Parcela 01 · ${rows[0].months} meses considerados no exemplo.`,
      `Parcela 02 · ${rows[1].months} meses considerados no exemplo.`,
      `Parcela 03 · ${rows[2].months} meses considerados no exemplo.`,
      mode === 1 ? 'Comparando o valor apresentado com o valor recalculado.' : 'Consolidando o total e preparando a memória.',
      'Memória de cálculo demonstrativa concluída.'
    ];
    card.querySelector('#calc-formula-value').textContent = formulaMessages[step];
    card.querySelector('#calc-cell-address').textContent = mode === 2
      ? (step >= 5 ? 'PÁG. 01' : 'DOCX')
      : (step >= 2 && step <= 4 ? `A${step}:D${step}` : step >= 5 ? 'A1:D4' : 'A1');

    statusEl.textContent = model.statuses[step === 0 ? 0 : step <= 4 ? 1 : step === 5 ? 2 : 3];
    card.querySelector('#jc-pause').textContent = paused ? 'Continuar' : 'Pausar';
    card.querySelector('#jc-pause').setAttribute('aria-pressed', String(paused));

    const progress = Math.min(1, step / 6);
    progressEl.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    card.querySelector('#calc-progress-bar').style.transform = `scaleX(${progress})`;
    stage();

    if (mode === 2 && REPORT_TYPING_STEPS.has(step) && lastReportTypedStep !== step) {
      lastReportTypedStep = step;
      typeReport(pickReportExample());
    } else if (mode !== 2 && step === 0) {
      clearInterval(reportTimer);
      reportTextEl.textContent = '';
      reportTextEl.classList.remove('is-typing');
    }
  }

  function visible() {
    return document.body.dataset.page === 'inicio' && !document.hidden && inView;
  }

  function sync() {
    clearTimeout(timer);
    tech?.classList.toggle('is-working', techVisible && document.body.dataset.page === 'inicio' && !document.hidden && !reducedMotion.matches && !paused);
    if (!visible() || paused || reducedMotion.matches) {
      cancelNumber(totalEl);
      totalEl.textContent = money(Number(totalEl.dataset.cents) || totals().base);
      return;
    }
    let hold;
    if (mode === 2) {
      if (REPORT_TYPING_STEPS.has(step)) {
        const currentText = reportExamples[reportExampleIndex] || '';
        hold = (currentText.length * REPORT_TYPE_INTERVAL) + REPORT_STATIC_HOLD;
      } else {
        hold = 420;
      }
    } else {
      hold = step >= 6 ? 5000 : step === 5 ? 3000 : 1650;
    }
    timer = setTimeout(() => {
      if (step < 6) step += 1;
      else {
        step = 0;
        mode = (mode + 1) % modes.length;
        generate();
      }
      paint();
      sync();
    }, hold);
  }

  function start(nextMode = mode) {
    clearTimeout(timer);
    clearInterval(reportTimer);
    mode = nextMode;
    step = reducedMotion.matches ? 6 : 0;
    lastReportTypedStep = -1;
    if (mode !== 2) reportExampleIndex = -1;
    generate();
    paint();
    if (reducedMotion.matches) {
      reportTextEl.textContent = finalReport();
      totalEl.textContent = money(totals().result);
      totalEl.dataset.cents = String(totals().result);
    }
    sync();
  }

  card.querySelectorAll('[data-calc-mode]').forEach(button => button.addEventListener('click', () => start(Number(button.dataset.calcMode))));
  card.querySelector('#jc-replay').addEventListener('click', () => start());
  card.querySelector('#jc-pause').disabled = reducedMotion.matches;
  card.querySelector('#jc-pause').addEventListener('click', () => {
    paused = !paused;
    clearTimeout(timer);
    if (paused) clearInterval(reportTimer);
    paint();
    sync();
  });

  const previous = onPageChange;
  onPageChange = () => { previous(); sync(); };
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener?.('change', () => {
    card.querySelector('#jc-pause').disabled = reducedMotion.matches;
    if (reducedMotion.matches) {
      step = 6;
      paint();
      if (mode === 2) reportTextEl.textContent = finalReport();
    }
    sync();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }, { threshold: 0.12 }).observe(card);
    if (tech) new IntersectionObserver(entries => { techVisible = entries[0].isIntersecting; sync(); }, { threshold: 0.1 }).observe(tech);
  } else {
    inView = true;
    techVisible = true;
  }

  start();
})();
