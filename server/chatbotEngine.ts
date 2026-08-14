import { GoogleGenAI } from '@google/genai';
import { db } from './db';
import {
  Order,
  StoreConfig,
  OrderItemMeat,
  OrderItemUnit,
  FormaPagamento,
  TipoRecebimento
} from '../src/types';

export function formatBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);
}

export function generateWhatsAppReceiptText(order: Order): string {
  const config = db.getConfig();
  let text = `*${config.empresa.toUpperCase()}* 🍖🔥\n`;
  text += `*COMPROVANTE DE PEDIDO ${order.numeroPedido}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👤 *Cliente:* ${order.clienteNome}\n`;
  text += `📱 *Contato:* ${order.clienteTelefone}\n`;
  text += `🕒 *Horário/Previsão:* ${order.horario}\n`;
  text += `📍 *Tipo:* ${order.tipoRecebimento === 'Entrega' ? '🛵 Entrega em Domicílio' : '🏬 Retirada no Balcão'}\n`;

  if (order.tipoRecebimento === 'Entrega') {
    text += `🏠 *Endereço:* ${order.enderecoRua || ''}, ${order.enderecoNumero || ''} - ${order.enderecoBairro || ''}\n`;
    if (order.enderecoComplemento) text += `📌 *Compl.:* ${order.enderecoComplemento}\n`;
    if (order.enderecoReferencia) text += `🎯 *Ref.:* ${order.enderecoReferencia}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 *ITENS DO PEDIDO:*\n`;

  order.carnes.forEach(c => {
    const pesoExibido = c.pesoRealKg ? `${c.pesoRealKg.toFixed(3).replace('.', ',')} kg (Real)` : c.peso;
    const sub = c.subtotalReal || c.subtotal;
    text += `• *${c.produto}* (${pesoExibido}) - ${formatBRL(sub)}\n`;
  });

  order.acompanhamentos.forEach(a => {
    const saborStr = a.sabor ? ` [${a.sabor}]` : '';
    text += `• ${a.quantidade}x *${a.produto}*${saborStr} - ${formatBRL(a.subtotal)}\n`;
  });

  order.bebidas.forEach(b => {
    text += `• ${b.quantidade}x *${b.produto}* - ${formatBRL(b.subtotal)}\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💵 *Subtotal:* ${formatBRL(order.subtotal)}\n`;
  if (order.taxaEntrega > 0) {
    text += `🛵 *Taxa de Entrega:* ${formatBRL(order.taxaEntrega)}\n`;
  }
  text += `💰 *TOTAL FINAL:* *${formatBRL(order.total)}*\n`;
  text += `💳 *Forma de Pagamento:* ${order.formaPagamento}\n`;

  if (order.formaPagamento === 'Dinheiro' && order.trocoPara) {
    const troco = order.trocoPara - order.total;
    text += `💵 *Troco para:* ${formatBRL(order.trocoPara)} (Troco a levar: ${formatBRL(Math.max(0, troco))})\n`;
  }

  if (order.formaPagamento === 'PIX' && config.chavePix) {
    text += `\n🔑 *Chave PIX (${config.tipoPix}):* \`${config.chavePix}\`\n`;
  }

  if (order.observacoes) {
    text += `\n📝 *Obs.:* ${order.observacoes}\n`;
  }

  text += `\nObrigado pela preferência! Bom apetite! 😋`;
  return text;
}

export function generateWeightAdjustmentWhatsAppText(order: Order): string {
  const config = db.getConfig();
  let text = `Olá, *${order.clienteNome}*! Aqui é dos *${config.empresa}* 🍖.\n\n`;
  text += `Seu pedido *${order.numeroPedido}* acabou de sair do fogo e foi pesado na nossa balança com precisão:\n\n`;

  order.carnes.forEach(c => {
    if (c.pesoRealKg) {
      text += `🥩 *${c.produto}*:\n`;
      text += `   • Estimado: ${c.peso} (${formatBRL(c.subtotal)})\n`;
      text += `   • Peso Real: *${c.pesoRealKg.toFixed(3).replace('.', ',')} kg* -> *${formatBRL(c.subtotalReal || c.subtotal)}*\n`;
    }
  });

  text += `\n💰 *Total Atualizado do Pedido:* *${formatBRL(order.total)}*\n`;
  text += `💳 *Forma de Pagamento:* ${order.formaPagamento}\n`;

  if (order.formaPagamento === 'PIX') {
    text += `🔑 *Chave PIX:* \`${config.chavePix}\`\n`;
  }

  if (order.tipoRecebimento === 'Retirada') {
    text += `\n🏬 Seu pedido já está embalado quentinho e pronto para retirada no balcão!`;
  } else {
    text += `\n🛵 Seu pedido está na rota e sairá para entrega em instantes!`;
  }

  return text;
}

export function generateKitchenOrderText(order: Order): string {
  let text = `================================\n`;
  text += `     ASSADOS DO JEFERSON\n`;
  text += `     COZINHA & BALCÃO\n`;
  text += `================================\n`;
  text += `PEDIDO: ${order.numeroPedido}\n`;
  text += `HORA: ${order.horario} (${order.tipoRecebimento.toUpperCase()})\n`;
  text += `CLIENTE: ${order.clienteNome}\n`;
  text += `FONE: ${order.clienteTelefone}\n`;
  if (order.tipoRecebimento === 'Entrega') {
    text += `END: ${order.enderecoRua || ''}, ${order.enderecoNumero || ''} - ${order.enderecoBairro || ''}\n`;
    if (order.enderecoComplemento) text += `COMPL: ${order.enderecoComplemento}\n`;
  }
  text += `--------------------------------\n`;
  text += `CARNES:\n`;
  order.carnes.forEach(c => {
    const pesoReal = c.pesoRealKg ? ` [PESO REAL: ${c.pesoRealKg.toFixed(3)} kg]` : '';
    text += ` [ ] ${c.peso} - ${c.produto.toUpperCase()}${pesoReal}\n`;
  });

  if (order.acompanhamentos.length > 0) {
    text += `--------------------------------\n`;
    text += `ACOMPANHAMENTOS:\n`;
    order.acompanhamentos.forEach(a => {
      text += ` [ ] ${a.quantidade}x ${a.produto.toUpperCase()}${a.sabor ? ` (${a.sabor})` : ''}\n`;
    });
  }

  if (order.bebidas.length > 0) {
    text += `--------------------------------\n`;
    text += `BEBIDAS:\n`;
    order.bebidas.forEach(b => {
      text += ` [ ] ${b.quantidade}x ${b.produto.toUpperCase()}\n`;
    });
  }

  if (order.observacoes) {
    text += `--------------------------------\n`;
    text += `OBS: ${order.observacoes}\n`;
  }

  text += `================================\n`;
  text += `TOTAL: ${formatBRL(order.total)} (${order.formaPagamento})\n`;
  text += `================================\n`;
  return text;
}

export async function processChatMessage(
  sessionId: string,
  userMessage: string,
  phone?: string
): Promise<{ reply: { text: string }; orderCreated?: Order }> {
  const session = db.getSession(sessionId);
  const products = db.getProducts().filter(p => p.ativo !== false);
  const taxes = db.getDeliveryTaxes().filter(t => t.ativo !== false);
  const config = db.getConfig();

  session.messages.push({
    sender: 'user',
    text: userMessage,
    timestamp: Date.now()
  });

  const prompt = `Você é o Atendente Virtual Inteligente e Especialista em Churrasco dos "Assados do Jeferson".
Seu objetivo é atender o cliente cordialmente pelo WhatsApp/Web, apresentar o cardápio, calcular estimativas de carnes (ex: 400g por pessoa), anotar acompanhamentos e bebidas, confirmar o endereço e finalizar o pedido.

DADOS DA EMPRESA:
- Nome: ${config.empresa}
- Telefone: ${config.telefone}
- Chave PIX: ${config.chavePix} (${config.tipoPix})
- Horário de Atendimento: ${config.horarioInicio} às ${config.horarioFim}
- Retirada: ${config.horarioRetiradaInicio} às ${config.horarioRetiradaFim}
- Taxa Padrão de Entrega: ${formatBRL(config.taxaPadrao)}

PRODUTOS ATIVOS NO BANCO:
${JSON.stringify(products, null, 2)}

TAXAS DE ENTREGA POR BAIRRO:
${JSON.stringify(taxes, null, 2)}

HISTÓRICO DA CONVERSA:
${session.messages.map(m => `${m.sender === 'user' ? 'Cliente' : 'Atendente'}: ${m.text}`).join('\n')}

INSTRUÇÕES:
1. Responda sempre em Português do Brasil, com tom caloroso, educado e focado em vendas de assados.
2. Quando o cliente solicitar fechamento ou confirmar todos os dados (carnes, acompanhamentos, tipo de entrega/retirada, endereço se entrega, e forma de pagamento), forneça a confirmação e no FINAL do seu JSON retorne os dados estruturados do pedido se o pedido estiver pronto para ser lançado.

Retorne SEMPRE e ESTRITAMENTE um objeto JSON válido no formato:
{
  "replyText": "texto da sua mensagem formatada para o WhatsApp com emojis",
  "orderData": null // ou objeto com { "clienteNome": "...", "clienteTelefone": "...", "tipoRecebimento": "Entrega"|"Retirada", "enderecoRua": "...", "enderecoNumero": "...", "enderecoBairro": "...", "enderecoComplemento": "...", "horario": "...", "carnes": [{"produto": "Costela Bovina", "peso": "1,5 kg", "pesoKg": 1.5, "precoKg": 68, "subtotal": 102}], "acompanhamentos": [{"produto": "Maionese de Batatas", "quantidade": 1, "precoUnitario": 18, "subtotal": 18}], "bebidas": [], "subtotal": 120, "taxaEntrega": 8, "total": 128, "formaPagamento": "PIX"|"Dinheiro"|"Cartão", "observacoes": "..." }
}
`;

  let replyText = 'Olá! Bem-vindo aos Assados do Jeferson. Como podemos preparar seu almoço de hoje? 🍖';
  let createdOrder: Order | undefined = undefined;

  try {
    const ai = new GoogleGenAI({});
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed.replyText) {
      replyText = parsed.replyText;
    }

    if (parsed.orderData && parsed.orderData.carnes && parsed.orderData.carnes.length > 0) {
      const ordPayload = parsed.orderData;
      createdOrder = db.createOrder({
        clienteNome: ordPayload.clienteNome || 'Cliente WhatsApp',
        clienteTelefone: ordPayload.clienteTelefone || phone || '(44) 99999-0000',
        tipoRecebimento: ordPayload.tipoRecebimento || 'Retirada',
        enderecoRua: ordPayload.enderecoRua,
        enderecoNumero: ordPayload.enderecoNumero,
        enderecoBairro: ordPayload.enderecoBairro,
        enderecoComplemento: ordPayload.enderecoComplemento,
        horario: ordPayload.horario || '12:00',
        carnes: ordPayload.carnes || [],
        acompanhamentos: ordPayload.acompanhamentos || [],
        bebidas: ordPayload.bebidas || [],
        subtotal: ordPayload.subtotal || 0,
        taxaEntrega: ordPayload.taxaEntrega || 0,
        total: ordPayload.total || 0,
        formaPagamento: ordPayload.formaPagamento || 'PIX',
        observacoes: ordPayload.observacoes,
        origem: 'IA'
      });
    }
  } catch (err: any) {
    console.error('Gemini chatbot fallback:', err);
    replyText = `Olá! 🍖 Bem-vindo aos *${config.empresa}*! Nossas carnes do dia: ${products.filter(p => p.categoria === 'Carne').map(c => `${c.nome} (${formatBRL(c.preco)}/kg)`).join(', ')}. Como podemos montar seu pedido?`;
  }

  session.messages.push({
    sender: 'bot',
    text: replyText,
    timestamp: Date.now()
  });
  db.saveSession(session);

  return {
    reply: { text: replyText },
    orderCreated: createdOrder
  };
}
