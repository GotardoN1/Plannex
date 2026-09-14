/* Dados demonstrativos locais. Nenhuma planilha ou informação é enviada. */
(function (root) {
  'use strict';

  const money = value => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0
  }).format(value);
  const percent = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value) + '%';
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const sample = (items, count) => [...items].sort(() => Math.random() - 0.5).slice(0, count);

  function getDemo(id) {
    if (id === 'sales') {
      const catalog = [
        ['Teclado', 90, 280], ['Mouse', 45, 190], ['Monitor', 650, 1800],
        ['Headset', 120, 460], ['Webcam', 140, 520], ['Notebook', 2600, 5900]
      ];
      const data = sample(catalog, 3).map(([name, min, max]) => ({
        name, qty: randomInt(1, 8), price: randomInt(Math.ceil(min / 10), Math.floor(max / 10)) * 10
      }));
      const units = data.reduce((sum, item) => sum + item.qty, 0);
      return {
        id, name: 'Controle de vendas.xlsx', sheet: 'Vendas', label: 'TOTAL CALCULADO', format: money,
        intro: 'Ponto de partida: vendas lançadas, mas totais e resumo ainda dependem de trabalho manual.',
        columns: ['Produto', 'Qtd.', 'Valor', 'Total'],
        rows: data.map((item, index) => ({
          initial: [item.name, String(item.qty), money(item.price), '...'],
          result: [item.name, String(item.qty), money(item.price), money(item.qty * item.price)],
          formula: `=B${index + 2}*C${index + 2}`
        })),
        value: data.reduce((sum, item) => sum + item.qty * item.price, 0),
        detail: `${units} unidades · ${data.length} produtos`,
        chart: data.map(item => ({ label: item.name, value: item.qty * item.price })),
        messages: [
          'Problema: os dados estão lançados, mas a equipe ainda precisa calcular e consolidar.',
          'Automação: a Planex aplica cálculos e regras sem refazer as contas linha por linha.',
          'Resultado: totais e indicadores ficam prontos para conferência.'
        ],
        done: 'Resultado: a equipe confere os números em vez de montar o resumo manualmente.'
      };
    }

    if (id === 'clean') {
      const catalog = [
        ['teclado', 'periféricos'], ['MOUSE', ' PERIFÉRICOS'], [' monitor ', 'telas'],
        ['WEBCAM ', ' acessórios '], [' headset', 'ÁUDIO'], [' notebook ', ' computadores ']
      ];
      const chosen = sample(catalog, 3);
      const data = chosen.map(([name, category]) => ({
        name: Math.random() > .5 ? `  ${name}` : `${name}  `,
        category: Math.random() > .5 ? `${category} ` : ` ${category}`,
        qty: randomInt(1, 14)
      }));
      const normalize = value => {
        const text = value.trim().toLocaleLowerCase('pt-BR');
        return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
      };
      return {
        id, name: 'Base de produtos.xlsx', sheet: 'Base organizada', label: 'REGISTROS PADRONIZADOS',
        format: value => String(Math.round(value)),
        intro: 'Ponto de partida: nomes, categorias e espaços inconsistentes dificultam a consolidação da base.',
        columns: ['Produto', 'Categoria', 'Qtd.', 'Status'],
        rows: data.map(item => ({
          initial: [item.name, item.category, String(item.qty), 'Pendente'],
          result: [normalize(item.name), normalize(item.category), String(item.qty), 'Pronto'],
          formula: 'Remover espaços extras e padronizar nomes'
        })),
        value: data.length,
        detail: `${data.length} registros organizados automaticamente`,
        chart: [
          { label: 'Nomes', value: randomInt(2, 5) },
          { label: 'Categorias', value: randomInt(2, 5) },
          { label: 'Registros', value: data.length }
        ],
        messages: [
          'Problema: a base chega com formatos diferentes e precisa ser revisada manualmente.',
          'Automação: a Planex limpa textos, espaços e padrões de forma consistente.',
          'Resultado: a base fica organizada para atualização e conferência.'
        ],
        done: 'Resultado: menos tempo corrigindo a base e mais tempo usando a informação.'
      };
    }

    if (id === 'metrics') {
      const months = ['Jul', 'Ago', 'Set'];
      const data = months.map(month => {
        const target = randomInt(13, 22) * 1000;
        const sales = Math.round(target * randomInt(78, 124) / 100 / 100) * 100;
        return { month, sales, target };
      });
      const value = data.reduce((sum, item) => sum + item.sales, 0);
      const target = data.reduce((sum, item) => sum + item.target, 0);
      return {
        id, name: 'Painel de resultados.xlsx', sheet: 'Indicadores', label: 'VENDAS NO PERÍODO', format: money,
        intro: 'Ponto de partida: os números existem, mas a leitura ainda depende de montar comparações e indicadores.',
        columns: ['Mês', 'Vendas', 'Meta', 'Atingido'],
        rows: data.map((item, index) => ({
          initial: [item.month, money(item.sales), money(item.target), '...'],
          result: [item.month, money(item.sales), money(item.target), percent(item.sales / item.target * 100)],
          formula: `=B${index + 2}/C${index + 2}`
        })),
        value,
        detail: percent(value / target * 100) + ' da meta do período',
        chart: data.map(item => ({ label: item.month, value: item.sales })),
        messages: [
          'Problema: vendas e metas estão na planilha, mas a análise ainda precisa ser montada.',
          'Automação: a Planex compara valores e calcula o desempenho automaticamente.',
          'Resultado: os indicadores ficam prontos para acompanhar a operação.'
        ],
        done: 'Resultado: a equipe acompanha o desempenho sem refazer o relatório do zero.'
      };
    }

    throw new Error('Demonstração desconhecida: ' + id);
  }

  const api = Object.freeze({ ids: ['sales', 'clean', 'metrics'], getDemo });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PLANEX_DEMOS = api;
})(typeof window !== 'undefined' ? window : globalThis);
