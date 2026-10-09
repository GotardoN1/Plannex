// Mensagens prontas para o cliente, uma por momento da demanda. Os botões de WhatsApp e e-mail da Central
// abrem a conversa já com o texto; o administrador revisa e envia (nada sai sozinho).
import { SERVICOS, reais, diaBr, primeiroNome } from './util.js';

// Chave PIX da Plannex (vai na mensagem de aceite e na OS).
export const PIX = { chave: '11945383454', titular: 'Plannex' };

// Preço de cada plano do site, em centavos. Os personalizados (sob orçamento) não têm: o valor é preenchido à mão.
export const PRECO_PLANO = {
  'Cálculo Geral': 19990,
  'Cálculo simples': 14990,
  'Pacote 10 cálculos': 119900,
  'Automação Pontual': 19990,
  'Pacote Evolução': 39990,
};
// Valor da demanda: o que o administrador definiu ou, se ainda não definiu, o preço do plano escolhido.
export const valorDaDemanda = c => (c.valor_centavos !== null && c.valor_centavos !== undefined ? c.valor_centavos : PRECO_PLANO[c.plano] ?? null);

// Prazo padrão, em dias úteis depois da confirmação (o mesmo que a Central usa ao aceitar).
export const PRAZO_DIAS = { calculos: 3, automacao: 5 };

// O que vai em cada entrega, no texto para o cliente.
const ENTREGAVEIS = {
  calculos: 'a memória de cálculo e o parecer técnico',
  automacao: 'a planilha automatizada, o vídeo demonstrativo e o guia de uso',
};

// Empresa recebe o nome completo ("Olá, Construtora Horizonte"); pessoa, só o primeiro nome.
const EMPRESA = /(^|[\s(])(ltda|s\/?a|eireli|me|epp|construtora|distribuidora|escrit[óo]rio|com[ée]rcio|ind[úu]stria|associa[çc][ãa]o|cl[íi]nica|mercado|padaria|loja|hotel|academia|gr[áa]fica|contabilidade|farm[áa]cia|transportadora|auto pe[çc]as|advogados|advocacia|grupo|empresa)($|[\s.,)])/i;
const nomeDe = c => (EMPRESA.test(c.nome || '') ? c.nome : primeiroNome(c.nome));
const servicoTexto = c => (c.servico === 'automacao' ? 'automação de planilha' : 'cálculo');
// A assinatura vem numa linha só, separada do texto por uma linha em branco.
const assinatura = '\n\nAtenciosamente, Equipe Plannex.';

// Em que momento a demanda está, para escolher a mensagem.
export function momento(c) {
  if (c.recusado_em && !c.etapa) return 'recusado';
  return c.etapa || 'recebido';
}

export const MOMENTOS = {
  recebido: 'Solicitação recebida',
  recusado: 'Solicitação recusada',
  nota_emitida: 'Aceite, OS e pagamento',
  pedido: 'Demanda em execução',
  revisado: 'Ajustes em andamento',
  entregue: 'Entrega',
  concluido: 'Conclusão',
};

// Texto da mensagem. "versao" só vale para a entrega (v1, v2…).
export function textoMensagem(c, qual = momento(c), { versao = 1 } = {}) {
  // Saudação; em algumas mensagens, com o protocolo da solicitação entre parênteses.
  const ola = (comProtocolo = false) => `Olá, ${nomeDe(c)}!${comProtocolo && c.protocolo ? ` (Protocolo ${c.protocolo})` : ''}`;
  const dias = PRAZO_DIAS[c.servico] || 3;
  const entregaveis = ENTREGAVEIS[c.servico] || 'os arquivos finais';
  switch (qual) {
    case 'recusado':
      return `Olá, ${nomeDe(c)}. Agradecemos o contato com a Plannex e o interesse em nossos serviços.\n\n`
        + 'Analisamos a sua solicitação com atenção e, infelizmente, ela não se enquadra no tipo de serviço que realizamos no momento. Por isso, não poderemos atendê-la.\n\n'
        + 'Se surgir outra necessidade de cálculos judiciais e financeiros ou de automação de planilhas, ficaremos à disposição.'
        + assinatura;
    case 'nota_emitida':
      return `${ola()}\n\nA sua solicitação foi aceita com sucesso.\nSegue a Ordem de Serviço com o escopo, o prazo e o valor do trabalho.\n\n`
        + 'Por gentileza, confira a documentação e siga o passo a passo:\n'
        + '1. Assine a Ordem de Serviço e nos envie de volta;\n'
        + `2. Efetue o pagamento via PIX ${PIX.chave} e nos envie o comprovante.\n\n`
        + `O prazo estimado é de ${dias} dias úteis a partir da confirmação. Em caso de dúvida, basta responder a esta mensagem.`
        + assinatura;
    case 'pedido':
      return `${ola()}\n\nConfirmamos o recebimento do pagamento e da Ordem de Serviço. A sua demanda já está em execução com a nossa equipe`
        + `${c.prazo ? `, com entrega prevista até ${diaBr(c.prazo)}` : ''}.`
        + assinatura;
    case 'revisado':
      return `${ola(true)}\n\nRecebemos os ajustes solicitados e já estamos preparando a nova versão, que será revisada em até 1 dia útil. Avisaremos assim que estiver pronta.`
        + assinatura;
    case 'entregue':
      return versao > 1
        ? `${ola()}\n\nInformamos que a sua demanda está concluída, já com os ajustes solicitados. Por gentileza, confira o material enviado; aguardamos a sua aprovação.\n\n`
          + `Seguem abaixo os anexos com ${entregaveis}.` + assinatura
        : `${ola()}\n\nTemos o prazer de informar que a sua demanda está concluída. Por gentileza, confira o material enviado; aguardamos a sua aprovação.\n\n`
          + `Seguem abaixo os anexos com ${entregaveis}.` + assinatura;
    case 'concluido':
      return `${ola(true)}\n\nA sua demanda foi concluída. Agradecemos a confiança no trabalho da Plannex.`
        + assinatura;
    default:
      return `${ola(true)}\n\nSomos da equipe da Plannex. Recebemos a sua solicitação de ${servicoTexto(c)} e já estamos analisando as informações e os documentos enviados.\n\n`
        + 'Em breve retornaremos com a análise, o prazo e os próximos passos.'
        + assinatura;
  }
}


const ASSUNTOS = {
  recebido: 'Recebemos a sua solicitação',
  recusado: 'Retorno sobre a sua solicitação',
  nota_emitida: 'Ordem de Serviço e próximos passos',
  pedido: 'Demanda em execução',
  revisado: 'Ajustes em andamento',
  entregue: 'Entrega da sua demanda',
  concluido: 'Demanda concluída',
};

export function assuntoMensagem(c, qual = momento(c), { versao = 1 } = {}) {
  const protocolo = c.protocolo ? ` · Ref. ${c.protocolo}` : '';
  const versaoTexto = qual === 'entregue' && versao > 1 ? ` (Versão ${versao})` : '';
  return `Plannex · ${ASSUNTOS[qual] || `Sua solicitação de ${SERVICOS[c.servico]?.nome.toLowerCase() || 'serviço'}`}${versaoTexto}${protocolo}`;
}

export function numeroWhatsApp(c) {
  let numero = String(c.telefone || '').replace(/\D/g, '');
  if (numero.length > 11 && numero.startsWith('55')) numero = numero.slice(2);
  if (numero.length < 10 || numero.length > 11) return null;
  return `55${numero}`;
}

export function linkWhatsAppMensagem(c, qual, opcoes) {
  const numero = numeroWhatsApp(c);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(textoMensagem(c, qual, opcoes))}` : null;
}

export function linkEmailMensagem(c, qual, opcoes) {
  if (!c.email) return null;
  return `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(assuntoMensagem(c, qual, opcoes))}&body=${encodeURIComponent(textoMensagem(c, qual, opcoes))}`;
}
