// Mensagens prontas para o cliente, uma por momento da demanda. Os botões de WhatsApp e e-mail da Central
// abrem a conversa já com o texto; o administrador revisa e envia (nada sai sozinho).
import { SERVICOS, reais, diaBr, primeiroNome } from './util.js';

// Chave PIX da Plannex. Enquanto estiver vazia, a mensagem deixa a lacuna para completar à mão.
export const PIX = { chave: '', titular: 'Plannex' };
const textoPix = () => (PIX.chave ? `${PIX.chave} (${PIX.titular})` : '__________ (chave PIX)');

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
const protocoloTexto = c => (c.protocolo ? ` (protocolo ${c.protocolo})` : '');
const assinatura = '\n\nAtenciosamente,\nEquipe Plannex';

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

// Texto da mensagem. "versao" só vale para a entrega (v1, v2…); "arquivo", o nome do ZIP.
export function textoMensagem(c, qual = momento(c), { versao = 1, arquivo = '' } = {}) {
  const ola = `Olá, ${nomeDe(c)}! Tudo bem?`;
  const dias = PRAZO_DIAS[c.servico] || 3;
  const valor = c.valor_centavos !== null && c.valor_centavos !== undefined ? reais(c.valor_centavos) : '';
  switch (qual) {
    case 'recusado':
      return `Olá, ${nomeDe(c)}. Agradecemos o contato com a Plannex e o interesse em nossos serviços.\n\n`
        + `Analisamos a sua solicitação${protocoloTexto(c)} com atenção e, infelizmente, ela não se enquadra no tipo de serviço que realizamos no momento. Por isso, não poderemos atendê-la.\n\n`
        + 'Se surgir outra necessidade de cálculos judiciais e financeiros ou de automação de planilhas, ficaremos à disposição.'
        + assinatura;
    case 'nota_emitida':
      return `${ola}\n\nA sua solicitação de ${servicoTexto(c)}${protocoloTexto(c)} foi aceita. Segue a Ordem de Serviço com o escopo, o prazo${valor ? ' e o valor' : ''} do trabalho.\n\n`
        + `Por gentileza, confira a documentação${valor ? ` e o valor (${valor})` : ' e os valores'}. Estando tudo de acordo, para darmos início:\n`
        + '1. assine a Ordem de Serviço e nos envie de volta;\n'
        + `2. efetue o pagamento via PIX — chave ${textoPix()} — e nos envie o comprovante.\n\n`
        + `O prazo estimado é de ${dias} dias úteis a partir da confirmação. Qualquer dúvida, é só responder esta mensagem.`
        + assinatura;
    case 'pedido':
      return `${ola}\n\nConfirmamos o recebimento da Ordem de Serviço${protocoloTexto(c)}. A sua demanda já está em execução com a nossa equipe`
        + `${c.prazo ? `, com entrega prevista até ${diaBr(c.prazo)}` : ''}.\n\nAvisaremos assim que estiver pronta.`
        + assinatura;
    case 'revisado':
      return `${ola}\n\nRecebemos os ajustes solicitados${protocoloTexto(c)} e já estamos preparando a nova versão. Avisaremos assim que estiver pronta.`
        + assinatura;
    case 'entregue':
      return `${ola}\n\nA sua demanda${protocoloTexto(c)} está pronta${versao > 1 ? `, já com os ajustes solicitados (versão ${versao})` : ''}. `
        + `Segue ${arquivo ? `o arquivo ${arquivo}, com ${ENTREGAVEIS[c.servico] || 'os arquivos finais'}` : `${ENTREGAVEIS[c.servico] || 'os arquivos finais'}`}.\n\n`
        + 'Por gentileza, confira o material. Se precisar de algum ajuste, é só responder esta mensagem informando o que deve ser alterado.\n\nObrigado pela confiança!'
        + assinatura;
    case 'concluido':
      return `${ola}\n\nA sua demanda${protocoloTexto(c)} foi concluída. Agradecemos pela confiança no trabalho da Plannex.\n\n`
        + 'Quando precisar de um novo cálculo ou de outra automação, é só nos chamar por aqui.'
        + assinatura;
    default:
      return `${ola}\n\nAqui é a equipe da Plannex. Recebemos a sua solicitação de ${servicoTexto(c)}${protocoloTexto(c)} e já estamos analisando as informações e os documentos enviados.\n\n`
        + 'Em breve retornaremos com a análise, o prazo e os próximos passos. Se quiser complementar algo, é só responder esta mensagem.'
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
  const protocolo = c.protocolo ? ` · ${c.protocolo}` : '';
  const versaoTexto = qual === 'entregue' && versao > 1 ? ` (v${versao})` : '';
  return `Plannex${protocolo} · ${ASSUNTOS[qual] || `Sua solicitação de ${SERVICOS[c.servico]?.nome.toLowerCase() || 'serviço'}`}${versaoTexto}`;
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
