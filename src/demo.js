// Ambiente de demonstração: perfis fictícios e dados fictícios que se renovam.
// Só é usado quando o Worker roda com DEMO=true (o "plannex-demo"); a Central real nunca chama isto.

export const PERFIS_DEMO = [
  { id: 1, usuario: 'carla', nome: 'Carla Mendes', papel: 'admin', dica: 'Administradora: vê tudo, inclusive valores, pagamentos, arquivo e equipe.' },
  { id: 2, usuario: 'paulo', nome: 'Paulo Andrade', papel: 'admin', dica: 'Administrador: distribui as demandas entre a equipe e cuida das notas fiscais.' },
  { id: 3, usuario: 'fernanda', nome: 'Fernanda Lima', papel: 'funcionario', dica: 'Funcionária: só vê as demandas em que é responsável, sem valores nem pagamentos.' },
  { id: 4, usuario: 'diego', nome: 'Diego Rocha', papel: 'funcionario', dica: 'Funcionário: anexa ordens de serviço, anota e avança as etapas das demandas dele.' },
  { id: 5, usuario: 'juliana', nome: 'Juliana Prado', papel: 'funcionario', dica: 'Funcionária recém-chegada: poucas demandas, uma delas atrasada.' },
];

const NOMES = [
  'Ana Paula Ribeiro', 'Bruno Carvalho', 'Distribuidora Sol Nascente', 'Eduardo Fonseca', 'Construtora Horizonte',
  'Gustavo Rocha Neto', 'Helena Duarte', 'Mercado Bom Preço', 'Igor Matos', 'Karina Souza', 'Escritório Andrade & Lopes',
  'Lucas Bittencourt', 'Natália Freitas', 'Otávio Nunes', 'Padaria Pão Dourado', 'Renato Silveira', 'Sabrina Costa',
  'Transportadora Via Sul', 'Thiago Moreira', 'Vanessa Araújo', 'Wagner Teixeira', 'Clínica Bem Viver', 'Marcos Tavares',
  'Patrícia Gomes', 'Rodrigo Esteves', 'Loja Casa & Cia', 'Simone Batista', 'Fábio Medeiros', 'Auto Peças Central',
  'Luciana Ferraz', 'Rafael Quintana', 'Academia Movimento', 'Cristina Pires', 'Hotel Recanto', 'Daniela Moura',
  'Gráfica Ponto Certo', 'Leandro Viana', 'Beatriz Coelho', 'Contabilidade Exata', 'Márcia Lacerda', 'Vinícius Prado', 'Farmácia Saúde+',
];

const PEDIDOS = {
  calculos: [
    ['Cálculo simples', 'Atualização de valores de uma reclamação trabalhista com três parcelas em atraso desde 2023.'],
    ['Cálculo personalizado', 'Preciso conferir o cálculo de liquidação apresentado pela outra parte. Acho que os juros estão errados.'],
    ['Cálculo simples', 'Revisão de contrato de financiamento de veículo com juros acima do contratado.'],
    ['Cálculo personalizado', 'Processo com quatro autores e várias verbas: horas extras, adicional noturno e reflexos.'],
    ['Cálculo simples', 'Atualização monetária de uma dívida de aluguel para notificar o inquilino.'],
  ],
  automacao: [
    ['Automação pontual', 'Hoje lanço as vendas em três abas e depois copio para o relatório mensal. Quero um botão que faça tudo.'],
    ['Pacote Evolução', 'Controle de estoque com entrada e saída. Perco muito tempo atualizando o saldo à mão.'],
    ['Automação pontual', 'Planilha de comissões dos vendedores, com fechamento por mês e relatório por vendedor.'],
    ['Pacote Evolução', 'Cadastro de clientes e agenda de visitas, com aviso de quem está sem visita há 30 dias.'],
    ['Automação pontual', 'Fluxo de caixa com gráfico mensal e alerta quando o saldo previsto fica negativo.'],
  ],
};

const ANOTACOES = [
  'Cliente pediu urgência: tem audiência marcada.',
  'Enviei a proposta pelo WhatsApp, aguardando retorno.',
  'Documentos conferidos. Falta o holerite de março.',
  'Combinado entregar a planilha com vídeo explicativo.',
  'Cliente aprovou a prévia, só pediu ajuste no relatório.',
  'Liguei e confirmei os dados bancários para a nota.',
];

const ETAPAS = ['pedido', 'nota_emitida', 'processo_iniciado', 'revisado', 'entregue'];

// Roteiro de cada contato: [etapa ou null, dias desde a chegada, dias na etapa atual, responsável, prazo em dias a partir de hoje]
// Montado à mão para a demonstração contar uma história: atrasos, pagamentos pendentes, novidades na caixa.
const ROTEIRO = [
  [null, 0, 0, null, null], [null, 0, 0, null, null], [null, 1, 1, null, null], [null, 2, 2, null, null], [null, 5, 5, null, null],
  ['pedido', 3, 1, 3, 9], ['pedido', 4, 2, 4, 12], ['pedido', 6, 3, 1, 6], ['pedido', 8, 6, 5, -2], ['pedido', 2, 1, null, null],
  ['nota_emitida', 9, 7, 2, 5], ['nota_emitida', 12, 4, 3, 3], ['nota_emitida', 7, 2, 4, 10], ['nota_emitida', 15, 9, 1, 2], ['nota_emitida', 6, 1, 4, 14],
  ['processo_iniciado', 14, 5, 3, 1], ['processo_iniciado', 18, 6, 4, 0], ['processo_iniciado', 20, 10, 3, -3], ['processo_iniciado', 11, 3, 2, 8],
  ['processo_iniciado', 16, 8, 4, 4], ['processo_iniciado', 22, 12, 5, 6], ['processo_iniciado', 13, 2, 1, 11],
  ['revisado', 25, 3, 3, 2], ['revisado', 28, 5, 4, 1], ['revisado', 30, 2, 1, 5], ['revisado', 24, 8, 2, -1], ['revisado', 33, 4, 3, 7],
  ['entregue', 35, 4, 3, null], ['entregue', 40, 10, 4, null], ['entregue', 45, 15, 1, null], ['entregue', 52, 20, 3, null],
  ['entregue', 58, 25, 4, null], ['entregue', 63, 30, 2, null], ['entregue', 70, 38, 3, null], ['entregue', 76, 44, 4, null],
  ['entregue', 21, 0, 1, null], ['entregue', 27, 0, 4, null], ['entregue', 44, 18, 3, null],
  [null, 30, 30, null, null], ['pedido', 40, 35, 2, null], [null, 60, 60, null, null], ['nota_emitida', 26, 20, 3, null],
];
// Os quatro últimos vão para o arquivo (não fecharam).
const ARQUIVADOS = 4;

const DIA = 86400000;

export async function resetarDemo(env) {
  const agora = Date.now();
  const iso = t => new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
  const dia = t => new Date(t - 3 * 3600000).toISOString().slice(0, 10);
  let semente = 20261001;
  const sorte = () => (semente = (semente * 16807) % 2147483647) / 2147483647;

  const contatos = [];
  const movimentacoes = [];
  const notas = [];
  const arquivos = [];

  ROTEIRO.forEach(([etapa, diasChegada, diasNaEtapa, responsavel, prazoDias], i) => {
    const id = i + 1;
    const servico = i % 5 === 1 || i % 5 === 3 ? 'automacao' : 'calculos';
    const [plano, descricao] = PEDIDOS[servico][i % 5];
    const nome = NOMES[i % NOMES.length];
    const criado = agora - diasChegada * DIA - Math.floor(sorte() * 6 + 1) * 3600000;
    const atualizado = etapa ? Math.min(agora - 600000, agora - diasNaEtapa * DIA - Math.floor(sorte() * 5) * 3600000) : null;
    const indice = etapa ? ETAPAS.indexOf(etapa) : -1;
    const valor = etapa ? (servico === 'calculos' ? [14990, 14990, 34990, 79000][i % 4] : [29990, 59980, 39990, 120000][i % 4]) : null;
    // Pagamento registrado a partir de "Notas e ordens", menos em duas notas emitidas (para aparecer em "Precisa de atenção").
    const pagoHoje = [15, 22].includes(i);
    const pago = pagoHoje ? dia(agora) : indice >= 2 || (indice === 1 && ![10, 13].includes(i)) ? dia(Math.max(criado, atualizado - DIA)) : null;
    const arquivado = i >= ROTEIRO.length - ARQUIVADOS;
    const email = `${nome.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim().split(/\s+/).slice(0, 2).join('.')}@exemplo.com`;
    contatos.push({
      id, servico, nome, telefone: `(11) 9${String(80000000 + Math.floor(sorte() * 19999999)).replace(/(\d{4})(\d{4})/, '$1-$2')}`,
      email, plano, descricao, envio_documentos: i % 3 ? 'Enviar posteriormente' : 'Anexar agora',
      origem: i % 7 === 3 ? 'whatsapp' : i % 11 === 5 ? 'indicacao' : 'site', criado_em: iso(criado), etapa,
      atualizado_em: atualizado ? iso(atualizado) : null,
      lido_em: diasChegada === 0 && i < 2 ? null : iso(criado + 1800000),
      arquivado_em: arquivado ? iso(agora - Math.floor(diasChegada / 2) * DIA) : null,
      valor_centavos: valor, nota_fiscal: indice >= 1 ? String(2400 + id) : null, pago_em: pago,
      prazo: etapa === 'entregue' ? dia(atualizado) : prazoDias === null ? null : dia(agora + prazoDias * DIA),
      responsavel_id: responsavel, criado_por: i % 7 === 3 ? 2 : null,
    });

    // Histórico: uma movimentação por etapa até a atual, espalhadas entre a chegada e hoje.
    if (etapa) {
      let de = null;
      for (let k = 0; k <= indice; k++) {
        const quando = k === indice ? atualizado : criado + (atualizado - criado) * ((k + 1) / (indice + 2));
        movimentacoes.push({ contato_id: id, de, para: ETAPAS[k], usuario_id: k === 0 ? 1 + (i % 2) : responsavel || 1, quando: iso(quando) });
        de = ETAPAS[k];
      }
      if (responsavel) notas.push({ contato_id: id, usuario_id: 1 + (i % 2), tipo: 'sistema', restrito: 0, texto: `definiu ${PERFIS_DEMO[responsavel - 1].nome} como responsável`, criado_em: iso(criado + DIA / 2) });
      notas.push({ contato_id: id, usuario_id: 2, tipo: 'sistema', restrito: 1, texto: `definiu o valor em ${reais(valor)}`, criado_em: iso(criado + DIA / 2 + 60000) });
      if (i % 3 === 0) notas.push({ contato_id: id, usuario_id: responsavel || 1, tipo: 'nota', restrito: 0, texto: ANOTACOES[i % ANOTACOES.length], criado_em: iso(atualizado - 3600000) });
      // Ordem de serviço anexada nos que já passaram de "Notas e ordens".
      if (indice >= 1 && i % 4 === 0) arquivos.push({ contato_id: id, nome: `OS-${String(id).padStart(4, '0')}.pdf`, usuario_id: responsavel || 2, criado_em: iso(criado + DIA), contato: nome });
    }
  });

  // Uploads de visitantes e os arquivos de exemplo antigos saem do KV.
  const { results: antigos } = await env.DB.prepare('SELECT chave FROM arquivos').all();
  await Promise.all(antigos.map(a => env.ARQUIVOS.delete(a.chave)));

  const arquivosComChave = await Promise.all(arquivos.map(async (a, i) => {
    const chave = `demo/os-${a.contato_id}-${i}`;
    const pdf = pdfDeExemplo(`Ordem de servico ${a.nome.replace('.pdf', '')}`, a.contato);
    await env.ARQUIVOS.put(chave, pdf);
    return { ...a, chave, tamanho: pdf.byteLength };
  }));

  // Poucas consultas grandes: o plano grátis limita quantas consultas cada acesso faz.
  const ids = PERFIS_DEMO.map(p => p.id).join(', ');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM arquivos'),
    env.DB.prepare('DELETE FROM notas'),
    env.DB.prepare('DELETE FROM movimentacoes'),
    env.DB.prepare('DELETE FROM contatos'),
    env.DB.prepare('DELETE FROM tentativas'),
    env.DB.prepare(`DELETE FROM usuarios WHERE id NOT IN (${ids})`),
    env.DB.prepare(inserir('usuarios', PERFIS_DEMO.map(p => ({ id: p.id, usuario: p.usuario, nome: p.nome, papel: p.papel, senha_hash: 'demo-sem-senha' })))
      + ' ON CONFLICT (id) DO UPDATE SET usuario = excluded.usuario, nome = excluded.nome, papel = excluded.papel, senha_hash = excluded.senha_hash'),
    env.DB.prepare(inserir('contatos', contatos)),
    env.DB.prepare(inserir('movimentacoes', movimentacoes)),
    env.DB.prepare(inserir('notas', notas)),
    env.DB.prepare(inserir('arquivos', arquivosComChave.map(a => ({ contato_id: a.contato_id, categoria: 'ordem', nome: a.nome, tipo: 'application/pdf', tamanho: a.tamanho, chave: a.chave, usuario_id: a.usuario_id, criado_em: a.criado_em })))),
  ]);
}

// INSERT com os valores escritos na própria consulta. Seguro aqui porque todos os dados
// são gerados por este arquivo (nada vem de visitante), e evita o limite de parâmetros do D1.
function inserir(tabela, linhas) {
  const colunas = Object.keys(linhas[0]);
  const valor = v => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  return `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES ${linhas.map(l => `(${colunas.map(c => valor(l[c])).join(', ')})`).join(', ')}`;
}

function reais(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// PDF de uma página, só com texto, para as ordens de serviço de exemplo poderem ser abertas.
function pdfDeExemplo(titulo, cliente) {
  const texto = s => s.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '');
  const linhas = [
    ['F1', 18, 760, texto(titulo)],
    ['F1', 12, 730, `Cliente: ${texto(cliente)}`],
    ['F1', 12, 710, 'Plannex - documento de demonstracao, dados ficticios.'],
  ];
  const conteudo = linhas.map(([f, t, y, s]) => `BT /${f} ${t} Tf 60 ${y} Td (${s}) Tj ET`).join('\n');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const posicoes = [];
  objetos.forEach((obj, i) => {
    posicoes.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${posicoes.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
