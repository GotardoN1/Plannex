// Gera a Ordem de Serviço da Plannex já preenchida com o que o cliente informou.
// Usa o PDF editável da casa (modelos/ordem-de-servico.pdf, ou o molde "Ordem de serviço" enviado na
// Central, se for um PDF com os mesmos campos). Os campos continuam editáveis: o resto se completa no
// leitor de PDF (ou à mão) e o cliente assina.
import { estado } from './estado.js';
import { NOME_ETAPA, CAIXA, reais, diaBr, diaDe, hoje } from './util.js';
import { PIX, PRAZO_DIAS, valorDaDemanda } from './mensagens.js';

// Quem pode constar como responsável pela demanda e pela entrega na OS (o administrador escolhe ao gerar).
export const RESPONSAVEIS_OS = ['Robson Barros', 'Gustavo Ricardo'];

const MODELO_PADRAO = './modelos/ordem-de-servico.pdf';

let biblioteca = null;
const carregarBiblioteca = () => (biblioteca ||= import('../vendor/pdf-lib.esm.min.js'));

// O modelo enviado em "Moldes em branco" vale se tiver os campos do formulário; senão, o padrão.
async function modelo(PDFDocument) {
  const enviado = (estado.moldes || []).find(m => m.tipo === 'ordem' && /\.pdf$/i.test(m.nome));
  if (enviado) {
    try {
      const resposta = await fetch('/api/moldes/ordem', { credentials: 'same-origin', cache: 'no-store' });
      if (resposta.ok) {
        const pdf = await PDFDocument.load(await resposta.arrayBuffer());
        if (pdf.getForm().getFields().some(f => f.getName() === 'cliente')) return pdf;
      }
    } catch { /* usa o padrão */ }
  }
  const resposta = await fetch(MODELO_PADRAO, { cache: 'no-cache' });
  if (!resposta.ok) throw new Error('Não foi possível carregar o modelo da ordem de serviço.');
  return PDFDocument.load(await resposta.arrayBuffer());
}

// A fonte padrão do PDF (Helvetica, WinAnsi) não tem todos os caracteres: troca o que não couber.
function limpo(texto) {
  return String(texto ?? '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/…/g, '...').replace(/\r\n?/g, '\n')
    .replace(/[^\n\x20-\x7e -ÿ]/g, '')
    .trim();
}

// Quebra em linhas para a largura do campo.
function linhas(texto, fonte, tamanho, largura) {
  const saida = [];
  for (const paragrafo of texto.split('\n')) {
    let linha = '';
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura || !linha) linha = tentativa;
      else { saida.push(linha); linha = palavra; }
    }
    saida.push(linha);
  }
  return saida;
}

// Escolhe o maior tamanho (de 8 a 5,5 pt) em que o texto cabe na caixa; se nem assim couber, corta.
function caber(campo, texto, fonte) {
  const { width, height } = campo.acroField.getWidgets()[0].getRectangle();
  const largura = width - 6;
  if (!campo.isMultiline()) {
    let tamanho = 8;
    while (tamanho > 5.5 && fonte.widthOfTextAtSize(texto, tamanho) > largura) tamanho -= 0.5;
    while (texto.length > 1 && fonte.widthOfTextAtSize(texto, tamanho) > largura) texto = `${texto.slice(0, -2)}…`;
    return { texto, tamanho };
  }
  for (let tamanho = 8; tamanho >= 5.5; tamanho -= 0.5) {
    const cabem = Math.floor((height - 4) / (tamanho * 1.18));
    if (linhas(texto, fonte, tamanho, largura).length <= cabem) return { texto, tamanho };
  }
  const tamanho = 5.5;
  const cabem = Math.max(1, Math.floor((height - 4) / (tamanho * 1.18)));
  const todas = linhas(texto, fonte, tamanho, largura);
  const cortadas = todas.slice(0, cabem);
  cortadas[cabem - 1] = `${cortadas[cabem - 1].replace(/\s*\S*$/, '')} … (completo na Central)`;
  return { texto: cortadas.join('\n'), tamanho };
}

// Marca os tipos de documento que o cliente mandou, pelo nome do arquivo.
function tiposDeDocumento(nomes) {
  const marcas = new Set();
  for (const nome of nomes.map(n => n.normalize('NFD').toLowerCase())) {
    let achou = false;
    if (/senten|acord|processo|peticao|decis|inicial/.test(nome)) { marcas.add('doc_processo'); achou = true; }
    if (/holerit|contracheq|recibo.*salar|folha/.test(nome)) { marcas.add('doc_holerites'); achou = true; }
    if (/demonstrat|extrato|memoria|calculo/.test(nome)) { marcas.add('doc_demonstrativos'); achou = true; }
    if (/\.(xlsx?|xlsm|csv)$/.test(nome)) { marcas.add('doc_planilha'); achou = true; }
    if (!achou) marcas.add('doc_outros');
  }
  return marcas;
}

// Escopo padrão de cada serviço: o que vai assinalado e o texto do escopo contratado.
const ESCOPO = {
  automacao: {
    marcas: ['ent_planilha', 'ent_video', 'ent_guia', 'ent_ajustes'],
    texto: 'Criação ou automação da planilha conforme a solicitação, com vídeo demonstrativo, guia de uso e rodada de ajustes após a entrega.',
  },
  calculos: {
    marcas: ['ent_memoria', 'ent_parecer', 'ent_planilha', 'ent_ajustes', 'ent_outro'],
    texto: 'Cálculo conforme a solicitação e os documentos recebidos, com memória de cálculo, parecer técnico, planilha de apoio e ajuste/suporte após a entrega.',
  },
};

function dados(c, arquivosDoCliente, responsavelOS) {
  const automacao = c.servico === 'automacao';
  const escopo = ESCOPO[automacao ? 'automacao' : 'calculos'];
  const dias = PRAZO_DIAS[c.servico] || 3;
  const resumo = [
    c.descricao,
    c.atividade_manual ? `Atividade manual a automatizar: ${c.atividade_manual}` : '',
    c.manter_inalterado ? `Deve permanecer inalterado: ${c.manter_inalterado}` : '',
  ].filter(Boolean).join('\n');
  // Valor: o definido na Central ou o preço do plano; "sob orçamento" fica em branco para preencher à mão.
  const valor = valorDaDemanda(c);
  const nomes = arquivosDoCliente.map(a => a.nome);
  const pendencias = nomes.length
    ? `Recebidos: ${nomes.join(', ')}`
    : c.envio_documentos === 'Enviar posteriormente' ? 'O cliente vai enviar os documentos depois.' : '';
  const etapa = c.etapa === 'concluido' ? 'Concluído' : c.etapa === 'entregue' ? 'Entregue (aguardando conclusão)'
    : !c.etapa || c.etapa === 'nota_emitida' ? 'Aguardando assinatura' : NOME_ETAPA[c.etapa] || `Na ${CAIXA.toLowerCase()}`;

  const textos = {
    protocolo: c.protocolo || `${diaDe(c.criado_em).slice(0, 4)}/${String(c.id).padStart(4, '0')}`,
    data_abertura: diaBr(diaDe(c.criado_em)),
    responsavel: responsavelOS || RESPONSAVEIS_OS.join(' / '),
    cliente: c.nome,
    cpf_cnpj: c.cpf,
    whatsapp: c.telefone,
    email: c.email,
    plano_modalidade: c.plano || (automacao ? 'Automação' : 'Cálculo'),
    resumo_solicitacao: resumo,
    documentos_pendencias: pendencias,
    escopo: escopo.texto,
    valor: valor !== null ? reais(valor) : '',
    pagamento: c.pago_em ? `Pago em ${diaBr(c.pago_em)}` : `PIX ${PIX.chave}, antes do início`,
    // Prazo estimado conta da confirmação (assinatura e pagamento).
    prazo: `${dias} dias úteis`,
    status_entrega: etapa,
    // Observações e condições específicas: o que o cliente escreveu em "Observações adicionais".
    observacoes: c.observacoes,
    proximos_passos: 'Conferir os dados, assinar esta OS e enviar o comprovante do PIX para iniciarmos.',
    cliente_aprovacao: c.nome,
    // Data da confirmação: o dia em que a OS foi gerada.
    data_aprovacao: diaBr(hoje()),
  };
  const marcas = new Set([automacao ? 'serv_automacao' : 'serv_calculos', ...escopo.marcas]);
  if (automacao && /evolu/i.test(c.plano || '')) marcas.add('serv_suporte');
  if (!automacao && /confer|revis|impugna/i.test(`${c.plano} ${c.descricao}`)) marcas.add('serv_conferencia');
  for (const m of tiposDeDocumento(nomes)) marcas.add(m);
  return { textos, marcas };
}

export async function gerarOS(c, arquivosDoCliente = [], { responsavel = '' } = {}) {
  const { PDFDocument, StandardFonts } = await carregarBiblioteca();
  const pdf = await modelo(PDFDocument);
  const formulario = pdf.getForm();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const nomes = new Set(formulario.getFields().map(f => f.getName()));
  const { textos, marcas } = dados(c, arquivosDoCliente, responsavel);

  for (const [nome, valor] of Object.entries(textos)) {
    const texto = limpo(valor);
    if (!texto || !nomes.has(nome)) continue;
    const campo = formulario.getTextField(nome);
    const ajuste = caber(campo, texto, fonte);
    campo.setText(ajuste.texto);
    campo.setFontSize(ajuste.tamanho);
  }
  for (const nome of marcas) if (nomes.has(nome)) formulario.getCheckBox(nome).check();
  formulario.updateFieldAppearances(fonte);
  pdf.setTitle(`Ordem de Serviço ${textos.protocolo} - ${limpo(c.nome)}`);

  // Sem "object streams": alguns leitores (o do Firefox, por exemplo) não acham os campos com eles.
  const bytes = await pdf.save({ useObjectStreams: false });
  const nomeArquivo = `OS-${textos.protocolo.replace('/', '-')}-${limpo(c.nome).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}.pdf`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  link.download = nomeArquivo;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  return nomeArquivo;
}
