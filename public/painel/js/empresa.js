// Empresa (só administradores): nome fantasia, razão social, CNPJ, os dois sócios e a divisão do que entra
// (percentual da Plannex e de cada sócio). O Financeiro usa esses números.
import { estado, acoes } from './estado.js';
import { api } from './api.js';
import { el, botao, icone, reais } from './util.js';
import { carregarFinanceiro } from './financeiro.js';

export async function desenharEmpresa(raiz) {
  // Já na tela: a atualização automática não apaga o que está sendo preenchido.
  if (raiz.querySelector('.grade-empresa')) return;
  raiz.replaceChildren(el('header', 'tela-topo', el('div', '', el('h1', '', 'Empresa'))), el('p', 'vazio-mini', 'Carregando…'));
  try {
    await carregarFinanceiro();
  } catch (e) {
    raiz.replaceChildren(el('header', 'tela-topo', el('div', '', el('h1', '', 'Empresa'))), el('p', 'aviso', e.message));
    return;
  }
  const e = estado.financeiro.empresa || {};
  const entrada = (nome, valor, extras = {}) => { const i = el('input'); i.name = nome; i.value = valor ?? ''; Object.assign(i, extras); return i; };
  const fantasia = entrada('nome_fantasia', e.nome_fantasia, { maxLength: 160, placeholder: 'Ex.: Plannex' });
  const razao = entrada('razao_social', e.razao_social, { maxLength: 160, placeholder: 'Ex.: Plannex Cálculos e Automação Ltda.' });
  const cnpj = entrada('cnpj', e.cnpj, { maxLength: 18, inputMode: 'numeric', placeholder: '00.000.000/0000-00' });
  const socio1 = entrada('socio1', e.socio1 || 'Gustavo Ricardo', { maxLength: 80 });
  const socio2 = entrada('socio2', e.socio2 || 'Robson Barros', { maxLength: 80 });
  const pctCasa = entrada('pct_casa', e.pct_casa ?? 30, { type: 'number', min: 0, max: 100, step: '0.5' });
  const pctSocio1 = entrada('pct_socio1', e.pct_socio1 ?? 50, { type: 'number', min: 0, max: 100, step: '0.5' });

  cnpj.addEventListener('input', () => {
    const d = cnpj.value.replace(/\D/g, '').slice(0, 14);
    cnpj.value = d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  });

  // Prévia da divisão de R$ 100.
  const previa = el('p', 'divisao-previa');
  const atualizarPrevia = () => {
    const casa = Math.min(100, Math.max(0, Number(pctCasa.value) || 0));
    const s1 = ((100 - casa) * Math.min(100, Math.max(0, Number(pctSocio1.value) || 0))) / 100;
    const s2 = 100 - casa - s1;
    previa.replaceChildren(icone('dinheiro'), el('span', '',
      'De cada R$ 100 recebidos: ', el('strong', '', `Plannex ${reais(casa * 100)}`), ' · ',
      el('strong', '', `${socio1.value || 'Sócio 1'} ${reais(Math.round(s1 * 100))}`), ' · ',
      el('strong', '', `${socio2.value || 'Sócio 2'} ${reais(Math.round(s2 * 100))}`)));
  };
  for (const i of [pctCasa, pctSocio1, socio1, socio2]) i.addEventListener('input', atualizarPrevia);
  atualizarPrevia();

  const salvar = botao('Salvar dados da empresa', 'botao--primario', async () => {
    salvar.disabled = true;
    try {
      await api('/api/empresa', {
        method: 'PATCH',
        corpo: {
          nome_fantasia: fantasia.value, razao_social: razao.value, cnpj: cnpj.value, socio1: socio1.value, socio2: socio2.value,
          pct_casa: Number(pctCasa.value), pct_socio1: Number(pctSocio1.value),
        },
      });
      acoes.avisar('Dados da empresa salvos.');
      await carregarFinanceiro();
    } catch (erro) {
      acoes.avisar(erro.message, 'erro');
    } finally {
      salvar.disabled = false;
    }
  }, { icone: 'ok' });

  raiz.replaceChildren(
    el('header', 'tela-topo', el('div', '', el('h1', '', 'Empresa'))),
    el('div', 'grade-empresa',
      el('section', 'bloco',
        el('div', 'bloco-topo', el('h2', 'titulo-icone', icone('documento'), 'Dados cadastrais')),
        el('label', 'campo', 'Nome fantasia', fantasia),
        el('label', 'campo', 'Razão social', razao),
        el('label', 'campo', 'CNPJ', cnpj)),
      el('section', 'bloco',
        el('div', 'bloco-topo', el('h2', 'titulo-icone', icone('equipe'), 'Sócios e divisão')),
        el('div', 'campos-lado', el('label', 'campo', 'Sócio 1', socio1), el('label', 'campo', 'Sócio 2', socio2)),
        el('div', 'campos-lado', el('label', 'campo', 'Fica para a Plannex (%)', pctCasa), el('label', 'campo', 'Do restante, para o sócio 1 (%)', pctSocio1)),
        el('p', 'bloco-dica', 'O sócio 2 fica com o resto. A parte da Plannex paga as despesas e forma o caixa da empresa.'),
        previa)),
    el('div', 'form-acoes', salvar));
}
