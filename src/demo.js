// Ambiente de demonstração: perfis fictícios e dados fictícios que se renovam.
// Só é usado quando o Worker roda com DEMO=true (o "plannex-demo"); a Central real nunca chama isto.

export const PERFIS_DEMO = [
  { id: 1, usuario: 'carla', area: 'Economista', nome: 'Carla Mendes', papel: 'admin', dica: 'Administradora: vê tudo, inclusive valores, pagamentos, arquivo e equipe.' },
  { id: 2, usuario: 'paulo', area: 'Administrativo', nome: 'Paulo Andrade', papel: 'admin', dica: 'Administrador: distribui as demandas entre a equipe e cuida das notas fiscais.' },
  { id: 3, usuario: 'fernanda', area: 'Economista', nome: 'Fernanda Lima', papel: 'funcionario', dica: 'Funcionária: só vê as demandas em que é responsável, sem valores nem pagamentos.' },
  { id: 4, usuario: 'diego', area: 'Advogado', nome: 'Diego Rocha', papel: 'funcionario', dica: 'Funcionário: anota e avança as demandas dele até concluir. Não vê notas nem ordens de serviço.' },
  { id: 5, usuario: 'juliana', area: 'T.I.', nome: 'Juliana Prado', papel: 'funcionario', dica: 'Funcionária recém-chegada: poucas demandas, uma delas atrasada.' },
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

// Andamento: 1. Notas e ordens -> 2. Pedido -> 3. Revisão -> 4. Entregue.
const ETAPAS = ['nota_emitida', 'pedido', 'revisado', 'entregue', 'concluido'];
// O roteiro abaixo foi escrito com as etapas antigas; aqui elas viram as novas.
const ETAPA_NOVA = { pedido: 'nota_emitida', nota_emitida: 'nota_emitida', processo_iniciado: 'pedido', revisado: 'revisado', entregue: 'entregue' };
// Um pedido da caixa de entrada já recusado, para a aba Recusados ter exemplo.
const RECUSADO = 4;

// Etiquetas pessoais de exemplo (contato, perfil, texto, cor).
const ETIQUETAS_EXEMPLO = [
  [1, 1, 'Urgente', 'rosa'], [6, 1, 'Cliente antigo', 'verde'], [12, 2, 'Veio do WhatsApp', 'verde'],
  [16, 3, 'Pacote Evolução', 'roxo'], [18, 3, 'Aguardando holerite', 'amarelo'], [17, 4, 'Prioridade', 'laranja'],
  [9, 5, 'Primeiro caso', 'azul'],
].map(([contato_id, usuario_id, texto, cor]) => ({ contato_id, usuario_id, texto, cor }));

// Comentários de exemplo para as abas da ficha.
const NO_PROCESSO = [
  'Conferi os holerites e as datas. Falta só o índice de correção do último mês.',
  'Planilha montada com as três abas. Testando os botões antes de mandar para o cliente.',
  'Juros calculados desde a citação, como pede a sentença.',
];
const AJUSTES = [
  'O cliente pediu para incluir as horas extras de março e refazer o relatório.',
  'Ajustar o nome das colunas do relatório mensal e incluir o total por vendedor.',
  'Cliente achou que faltou o reflexo no 13º. Revisar e reenviar.',
];
const NA_ENTREGA = [
  'Entregue por e-mail com a memória de cálculo e o parecer.',
  'Planilha entregue com vídeo explicativo. Cliente aprovou.',
];

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
  // Segunda trava: só roda com a demonstração confirmada (DEMO_ATIVA vem de prepararAmbiente, que confere
  // se o banco e o armazenamento ligados são os da demonstração). Sem isso, não apaga nada.
  if (env.DEMO_ATIVA !== true) throw new Error('resetarDemo recusado: ambiente de demonstração não confirmado.');
  const agora = Date.now();
  const iso = t => new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
  const dia = t => new Date(t - 3 * 3600000).toISOString().slice(0, 10);
  let semente = 20261001;
  const sorte = () => (semente = (semente * 16807) % 2147483647) / 2147483647;

  const contatos = [];
  const movimentacoes = [];
  const notas = [];
  const arquivos = [];

  ROTEIRO.forEach(([etapaAntiga, diasChegada, diasNaEtapa, responsavelRoteiro, prazoDias], i) => {
    // Entregues antigas viram concluídas; as duas mais recentes ficam esperando a conclusão do administrador.
    const etapa = etapaAntiga === 'entregue' ? (diasNaEtapa <= 1 ? 'entregue' : 'concluido') : etapaAntiga ? ETAPA_NOVA[etapaAntiga] : null;
    // Em Notas e ordens ainda não há responsável: ele é escolhido ao passar para Pedido.
    const responsavel = etapa === 'nota_emitida' ? null : responsavelRoteiro;
    // Quem estava em "Notas e ordens" no roteiro antigo já tem nota emitida (e quase todos, pagamento).
    const comNota = etapaAntiga === 'nota_emitida';
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
    const pago = pagoHoje ? dia(agora) : indice >= 1 || (comNota && ![10, 13].includes(i)) ? dia(Math.max(criado, atualizado - DIA)) : null;
    const arquivado = i >= ROTEIRO.length - ARQUIVADOS;
    // CPF fictício (empresas ganham CNPJ), só para a ordem de serviço sair completa.
    const numeros = n => Array.from({ length: n }, () => Math.floor(sorte() * 10)).join('');
    const cpf = /distribui|constru|mercado|escrit|padaria|transport|cl[ií]nica|loja|auto pe|academia|hotel|gr[aá]fica|contabil|farm[aá]cia/i.test(nome)
      ? numeros(14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      : numeros(11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const email = `${nome.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim().split(/\s+/).slice(0, 2).join('.')}@exemplo.com`;
    contatos.push({
      id, servico, nome, telefone: `(11) 9${String(80000000 + Math.floor(sorte() * 19999999)).replace(/(\d{4})(\d{4})/, '$1-$2')}`,
      email, cpf, plano, descricao, envio_documentos: i % 3 ? 'Enviar posteriormente' : 'Anexar agora',
      origem: i % 7 === 3 ? 'whatsapp' : i % 11 === 5 ? 'indicacao' : 'site', criado_em: iso(criado), etapa,
      atualizado_em: atualizado ? iso(atualizado) : null,
      lido_em: diasChegada === 0 && i < 2 ? null : iso(criado + 1800000),
      // Em Pedido, alguns ainda não foram iniciados pelo funcionário.
      iniciado_em: indice >= 1 && !(etapa === 'pedido' && i % 3 === 0) ? iso(atualizado - 3600000) : null,
      arquivado_em: arquivado ? iso(agora - Math.floor(diasChegada / 2) * DIA) : null,
      recusado_em: i === RECUSADO ? iso(criado + DIA / 2) : null,
      valor_centavos: valor, nota_fiscal: indice >= 1 || comNota ? String(2400 + id) : null, pago_em: pago,
      prazo: indice >= 3 ? dia(atualizado) : prazoDias === null ? null : dia(agora + prazoDias * DIA),
      responsavel_id: responsavel, criado_por: i % 7 === 3 ? 2 : null,
    });

    // Histórico: o caminho real até a etapa atual, espalhado entre a chegada e hoje. Pedido entrega direto;
    // a Retificação só aparece quando o administrador reprovou (as que estão nela e algumas concluídas).
    if (etapa) {
      const comRetificacao = etapa === 'revisado' || ((etapa === 'entregue' || etapa === 'concluido') && i % 4 === 0);
      const caminho = ['nota_emitida', 'pedido', 'entregue', ...(comRetificacao ? ['revisado', 'entregue'] : []), 'concluido'];
      const ate = caminho.lastIndexOf(etapa);
      let de = null;
      for (let k = 0; k <= ate; k++) {
        const quando = k === ate ? atualizado : criado + (atualizado - criado) * ((k + 1) / (ate + 2));
        const doAdmin = k === 0 || caminho[k] === 'concluido' || caminho[k] === 'revisado' || caminho[k] === 'pedido';
        movimentacoes.push({ contato_id: id, de, para: caminho[k], usuario_id: doAdmin ? 1 + (i % 2) : responsavel || 1, quando: iso(quando) });
        de = caminho[k];
      }
      const anotar = (usuario, tipo, restrito, texto, quando, aba) => notas.push({ contato_id: id, usuario_id: usuario, tipo, restrito, texto, criado_em: iso(quando), etapa: aba });
      if (responsavel) anotar(1 + (i % 2), 'sistema', 0, `definiu ${PERFIS_DEMO[responsavel - 1].nome} como responsável`, criado + DIA / 2, null);
      anotar(2, 'sistema', 1, `definiu o valor em ${reais(valor)}`, criado + DIA / 2 + 60000, null);
      if (i % 3 === 0) anotar(responsavel || 1, 'nota', 0, ANOTACOES[i % ANOTACOES.length], criado + DIA / 3, 'entrada');
      if ((indice >= 1 || comNota) && i % 5 === 1) anotar(2, 'nota', 1, 'Nota emitida e enviada ao cliente. Aguardando o pagamento.', criado + DIA, 'nota_emitida');
      if (indice >= 1 && i % 2 === 0) anotar(responsavel || 1, 'nota', 0, NO_PROCESSO[i % NO_PROCESSO.length], atualizado - 5 * 3600000, 'processo_iniciado');
      if (etapa === 'revisado' || (indice >= 3 && i % 4 === 0)) anotar(1 + (i % 2), 'nota', 0, AJUSTES[i % AJUSTES.length], atualizado - 2 * 3600000, 'revisado');
      if (indice >= 3) anotar(responsavel || 1, 'nota', 0, NA_ENTREGA[i % NA_ENTREGA.length], atualizado - 60000, 'entregue');

      // Arquivos de exemplo: OS (administrador), versão para revisão e arquivos finais.
      if ((indice >= 1 || comNota) && i % 4 === 0) arquivos.push({ contato_id: id, categoria: 'ordem', nome: `OS-${String(id).padStart(4, '0')}.pdf`, usuario_id: 2, criado_em: iso(criado + DIA), contato: nome });
      if (indice >= 2 && i % 2 === 0) arquivos.push({ contato_id: id, categoria: 'entrega', nome: 'Relatorio-final.pdf', usuario_id: responsavel || 1, criado_em: iso(atualizado - 3 * 3600000), contato: nome });
      if (indice >= 3 && i % 2 === 0) arquivos.push({ contato_id: id, categoria: 'entrega', nome: 'Memoria-de-calculo.csv', usuario_id: responsavel || 1, criado_em: iso(atualizado - 2 * 3600000), contato: nome });
    }
    // Documentos que a pessoa enviou pelo site.
    if (i % 3 === 0 && i < 30) arquivos.push({ contato_id: id, categoria: 'cliente', nome: servico === 'calculos' ? 'Sentenca-e-holerites.pdf' : 'Planilha-atual.csv', usuario_id: null, criado_em: iso(criado), contato: nome });
  });

  // Protocolo PLX-ANO-NNNN na ordem de chegada, como na Central real.
  const contagem = {};
  for (const c of [...contatos].sort((a, b) => a.criado_em.localeCompare(b.criado_em) || a.id - b.id)) {
    const ano = new Date(new Date(c.criado_em).getTime() - 3 * 3600000).getUTCFullYear();
    contagem[ano] = (contagem[ano] || 0) + 1;
    c.protocolo = `PLX-${ano}-${String(contagem[ano]).padStart(4, '0')}`;
  }

  // O KV grátis tem poucas gravações por dia, compartilhadas com a Central real. Por isso os arquivos
  // de exemplo têm chave fixa e só são gravados quando faltam; o reinício apaga só os enviados por visitantes.
  const { results: antigos } = await env.DB.prepare(
    "SELECT chave FROM arquivos WHERE chave NOT LIKE 'demo/amostra/%' UNION ALL SELECT chave FROM moldes WHERE chave NOT LIKE 'demo/amostra/%' UNION ALL SELECT chave FROM materiais WHERE chave NOT LIKE 'demo/amostra/%'"
  ).all();
  await Promise.all(antigos.map(a => env.ARQUIVOS.delete(a.chave)));

  // Moldes em branco de exemplo (ordem de serviço em PDF e relatório que abre no Word).
  const moldes = await Promise.all([
    { tipo: 'relatorio', nome: 'Molde-relatorio.doc', conteudo: relatorioDeExemplo() },
  ].map(async m => {
    const chave = `demo/amostra/moldes/${m.nome}`;
    if (!(await env.ARQUIVOS.get(chave, { type: 'arrayBuffer' }))) await env.ARQUIVOS.put(chave, m.conteudo);
    return { tipo: m.tipo, nome: m.nome, tamanho: m.conteudo.byteLength, chave, usuario_id: 1 };
  }));

  // Materiais de exemplo (aba Materiais): uma planilha de índices, um PDF de apresentação e um checklist.
  const materiais = await Promise.all([
    { nome: 'Indices-de-correcao-exemplo.csv', descricao: 'Tabela de índices usada nos cálculos de exemplo', tipo: 'text/csv', conteudo: new TextEncoder().encode('﻿Mes;IPCA-E;SELIC\r\nJan/2026;0,42;0,95\r\nFev/2026;0,38;0,88\r\nMar/2026;0,31;0,91'), usuario_id: 1, dias: 20 },
    { nome: 'Apresentacao-Plannex.pdf', descricao: 'Apresentação curta para enviar a escritórios', tipo: 'application/pdf', conteudo: pdfDeExemplo('Plannex - apresentacao', 'Escritorios parceiros'), usuario_id: 2, dias: 9 },
    { nome: 'Molde-ordem-de-servico.pdf', descricao: 'Molde em branco da ordem de serviço', visibilidade: 'admin', tipo: 'application/pdf', conteudo: pdfDeExemplo('Ordem de servico (molde em branco)', '______________________________'), usuario_id: 1, dias: 30 },
    { nome: 'Checklist-de-documentos.pdf', descricao: 'O que pedir ao cliente antes de começar um cálculo', tipo: 'application/pdf', conteudo: pdfDeExemplo('Checklist de documentos', 'Uso interno'), usuario_id: 1, dias: 3 },
  ].map(async m => {
    const chave = `demo/amostra/materiais/${m.nome}`;
    if (!(await env.ARQUIVOS.get(chave, { type: 'arrayBuffer' }))) await env.ARQUIVOS.put(chave, m.conteudo);
    const quando = iso(agora - m.dias * DIA);
    return { nome: m.nome, descricao: m.descricao, tipo: m.tipo, tamanho: m.conteudo.byteLength, chave, usuario_id: m.usuario_id, visibilidade: m.visibilidade || 'todos', criado_em: quando, atualizado_em: quando };
  }));

  const arquivosComChave = await Promise.all(arquivos.map(async a => {
    const chave = `demo/amostra/${a.contato_id}/${a.categoria}/${a.nome}`;
    const conteudo = conteudoDeExemplo(a);
    if (!(await env.ARQUIVOS.get(chave, { type: 'arrayBuffer' }))) await env.ARQUIVOS.put(chave, conteudo);
    return { ...a, chave, tamanho: conteudo.byteLength };
  }));

  // Poucas consultas grandes: o plano grátis limita quantas consultas cada acesso faz.
  const ids = PERFIS_DEMO.map(p => p.id).join(', ');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM etiquetas'),
    env.DB.prepare('DELETE FROM arquivos'),
    env.DB.prepare('DELETE FROM notas'),
    env.DB.prepare('DELETE FROM movimentacoes'),
    env.DB.prepare('DELETE FROM contatos'),
    // Mantém os contadores de limite da própria demonstração.
    env.DB.prepare("DELETE FROM tentativas WHERE chave NOT LIKE 'demo-%'"),
    env.DB.prepare(`DELETE FROM usuarios WHERE id NOT IN (${ids})`),
    env.DB.prepare(inserir('usuarios', PERFIS_DEMO.map(p => ({ id: p.id, usuario: p.usuario, nome: p.nome, papel: p.papel, area: p.area, senha_hash: 'demo-sem-senha' })))
      + ' ON CONFLICT (id) DO UPDATE SET usuario = excluded.usuario, nome = excluded.nome, papel = excluded.papel, senha_hash = excluded.senha_hash, area = excluded.area, apelido = NULL, tema = \'escuro\''),
    env.DB.prepare(inserir('contatos', contatos)),
    env.DB.prepare('DELETE FROM protocolos'),
    env.DB.prepare(inserir('protocolos', Object.entries(contagem).map(([ano, ultimo]) => ({ ano: Number(ano), ultimo })))),
    env.DB.prepare(inserir('movimentacoes', movimentacoes)),
    env.DB.prepare(inserir('notas', notas)),
    // Etiquetas pessoais de exemplo: cada perfil vê só as suas.
    env.DB.prepare(inserir('etiquetas', ETIQUETAS_EXEMPLO)),
    env.DB.prepare('DELETE FROM moldes'),
    env.DB.prepare('DELETE FROM materiais'),
    env.DB.prepare(inserir('materiais', materiais)),
    env.DB.prepare(inserir('moldes', moldes)),
    env.DB.prepare(inserir('arquivos', arquivosComChave.map(a => ({ contato_id: a.contato_id, categoria: a.categoria, nome: a.nome, tipo: a.nome.endsWith('.csv') ? 'text/csv' : 'application/pdf', tamanho: a.tamanho, chave: a.chave, usuario_id: a.usuario_id, criado_em: a.criado_em })))),
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

function conteudoDeExemplo(a) {
  if (a.nome.endsWith('.csv')) {
    const linhas = a.categoria === 'cliente'
      ? ['Data;Produto;Quantidade;Valor', '01/09/2026;Produto A;12;1.440,00', '02/09/2026;Produto B;5;620,00', '03/09/2026;Produto A;8;960,00']
      : ['Competencia;Historico;Fator;Corrigido;Juros;Total', 'Jan/2025;10000,00;1,0400;10400,00;312,00;10712,00', 'Fev/2025;8000,00;1,0350;8280,00;207,00;8487,00', 'Total;18000,00;;18680,00;519,00;19199,00'];
    return new TextEncoder().encode('\ufeff' + linhas.join('\r\n'));
  }
  const titulos = { ordem: `Ordem de servico ${a.nome.replace('.pdf', '')}`, entrega: 'Relatorio final', cliente: 'Documentos enviados pelo cliente' };
  return pdfDeExemplo(titulos[a.categoria] || a.nome, a.contato);
}

// Relatório de exemplo em RTF: salvo como .doc, abre direto no Word.
function relatorioDeExemplo() {
  const rtf = [
    '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}\\f0\\fs22',
    '{\\b\\fs32 Relat\\\'f3rio}\\par\\par',
    'Cliente: ______________________________\\par',
    'Servi\\\'e7o: ______________________________\\par',
    'Data de entrega: ____/____/________\\par\\par',
    '{\\b Objetivo}\\par ______________________________________________\\par\\par',
    '{\\b Metodologia}\\par ______________________________________________\\par\\par',
    '{\\b Resultado}\\par ______________________________________________\\par\\par',
    'Plannex - molde de demonstra\\\'e7\\\'e3o.\\par',
    '}',
  ].join('\n');
  return new TextEncoder().encode(rtf);
}

// PDF de uma página, só com texto, para os arquivos de exemplo poderem ser abertos.
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
