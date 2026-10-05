// Triagem: confere se o serviço e o plano marcados pelo cliente combinam com o que ele escreveu.
// Só sinaliza (a decisão é da equipe); corrigir a classificação não mexe no texto original.

// Planos de cada serviço (os mesmos do formulário do site).
export const PLANOS = {
  calculos: ['Cálculo simples', 'Pacote 10 cálculos', 'Cálculo personalizado'],
  automacao: ['Automação Pontual', 'Pacote Evolução', 'Automação personalizada'],
};

// Palavras que indicam cada serviço.
const SINAIS = {
  calculos: [/c[áa]lculo/, /senten[çc]a/, /ac[óo]rd[ãa]o/, /processo/, /trabalhist/, /rescis/, /\bfgts\b/, /horas? extras?/, /\bjuros\b/,
    /(corre[çc][ãa]o|atualiza[çc][ãa]o) monet/, /liquida[çc]/, /\bverbas?\b/, /honor[áa]rios/, /pens[ãa]o/, /impugna/, /per[íi]cia/,
    /indeniza/, /\bexecu[çc][ãa]o\b/, /holerite/, /contracheque/, /reclama[çc][ãa]o/, /peti[çc][ãa]o/, /\bdano/],
  automacao: [/planilha/, /\bexcel\b/, /\bmacros?\b/, /\bvba\b/, /automati/, /automa[çc]/, /dashboard/, /\bestoque\b/, /f[óo]rmula/,
    /\bbot[ãa]o/, /power ?bi/, /google sheets/, /\bcadastro/, /lan[çc]amento/, /\babas?\b/, /\bsistema\b/, /\brelat[óo]rios?\b/],
};
const NOME = { calculos: 'Cálculos', automacao: 'Automação' };

const pontos = (texto, servico) => SINAIS[servico].reduce((soma, sinal) => soma + (sinal.test(texto) ? 1 : 0), 0);

// { alerta, motivo, sugestao } — alerta false quando está tudo coerente (ou não dá para dizer).
export function avaliarClassificacao(c) {
  const marcado = c.servico;
  const outro = marcado === 'calculos' ? 'automacao' : 'calculos';
  if (!PLANOS[marcado]) return { alerta: false };
  if (c.plano && PLANOS[outro].includes(c.plano)) {
    return { alerta: true, sugestao: outro, motivo: `O plano "${c.plano}" é de ${NOME[outro]}, mas o serviço marcado é ${NOME[marcado]}.` };
  }
  const texto = [c.descricao, c.atividade_manual, c.manter_inalterado].filter(Boolean).join(' ').toLowerCase();
  if (!texto) return { alerta: false };
  const doMarcado = pontos(texto, marcado);
  const doOutro = pontos(texto, outro);
  if (doOutro >= 2 && doOutro > doMarcado) {
    return { alerta: true, sugestao: outro, motivo: `A descrição fala mais de ${NOME[outro]}, mas o serviço marcado é ${NOME[marcado]}.` };
  }
  return { alerta: false };
}
