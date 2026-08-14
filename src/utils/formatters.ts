import { Order, StoreConfig, OrderStatus } from '../types';

export const AVAILABLE_TIME_SLOTS: string[] = [
  '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45',
  '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45',
  '14:00', '14:15', '14:30', '14:45',
  '15:00'
];

export function formatBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val || 0);
}

export function generateOrderStatusNotification(
  order: Order,
  status: OrderStatus,
  config?: Partial<StoreConfig>,
  forceIncludePix = false
): string {
  const empresa = config?.empresa || 'Assados do Jeferson';
  const chavePix = config?.chavePix || 'assadosdojeferson@gmail.com';
  const tipoPix = config?.tipoPix || 'Chave E-mail';
  const titularPix = config?.titularPix || empresa;

  let text = `Olá, *${order.clienteNome}*! Aqui é do *${empresa}* 🍖🔥\n\n`;

  switch (status) {
    case 'NOVO':
    case 'CONFIRMADO':
      text += `Passando para avisar que seu pedido *${order.numeroPedido}* foi *CONFIRMADO* com sucesso!\n`;
      text += `🕒 *Previsão de ${order.tipoRecebimento === 'Entrega' ? 'Entrega' : 'Retirada'}:* ${order.horario}\n`;
      break;
    case 'EM_PREPARACAO':
      text += `Seu pedido *${order.numeroPedido}* já está *EM PREPARAÇÃO* no nosso fogo a lenha! ♨️\n`;
      text += `Logo mais estará no ponto perfeito, suculento e dourado.\n`;
      break;
    case 'PRONTO':
      if (order.tipoRecebimento === 'Retirada') {
        text += `✨ Seu pedido *${order.numeroPedido}* está *PRONTO E EMBALADO* quentinho aguardando sua retirada no balcão!\n`;
      } else {
        text += `✨ Seu pedido *${order.numeroPedido}* está *PRONTO E EMBALADO* e em instantes sairá para entrega!\n`;
      }
      break;
    case 'SAIU_PARA_ENTREGA':
      text += `🛵 *SAIU PARA ENTREGA!*\n`;
      text += `Seu pedido *${order.numeroPedido}* acabou de sair com o nosso entregador a caminho do seu endereço:\n`;
      text += `📍 ${order.enderecoRua || ''}, ${order.enderecoNumero || ''} - ${order.enderecoBairro || ''}\n`;
      if (order.enderecoComplemento) text += `📌 Compl.: ${order.enderecoComplemento}\n`;
      break;
    case 'FINALIZADO':
      text += `✅ Seu pedido *${order.numeroPedido}* foi concluído com sucesso!\n`;
      text += `Agradecemos muito pela sua preferência e confiança. Tenha um excelente apetite! 😋🥩\n`;
      break;
    case 'CANCELADO':
      text += `Informamos que o seu pedido *${order.numeroPedido}* foi cancelado em nosso sistema.\n`;
      text += `Caso tenha qualquer dúvida, por favor responda a esta mensagem.\n`;
      break;
  }

  // Weight info if weighed
  if (order.pesagemFinalizada && order.carnes.some(c => c.pesoRealKg)) {
    text += `\n⚖️ *PESAGEM FINAL DA BALANÇA:*\n`;
    order.carnes.forEach(c => {
      if (c.pesoRealKg) {
        text += `• *${c.produto}*: ${c.pesoRealKg.toFixed(3).replace('.', ',')} kg -> *${formatBRL(c.subtotalReal || c.subtotal)}*\n`;
      }
    });
  }

  text += `\n💰 *Total do Pedido:* *${formatBRL(order.total)}* (${order.formaPagamento})\n`;

  // PIX details if payment is PIX or forced
  const isPix = forceIncludePix || order.formaPagamento === 'PIX';
  if (isPix && chavePix) {
    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔑 *DADOS PARA PAGAMENTO VIA PIX:*\n`;
    text += `💰 *Valor:* *${formatBRL(order.total)}*\n`;
    text += `📌 *Chave PIX (${tipoPix}):* \`${chavePix}\`\n`;
    if (titularPix) text += `👤 *Titular:* ${titularPix}\n`;
    text += `📲 *Por favor, envie o comprovante por aqui assim que concluir a transferência.* 👍\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  }

  text += `\nQualquer dúvida estamos à disposição!`;
  return text;
}

export function generateWhatsAppReceiptText(order: Order, config?: Partial<StoreConfig>): string {
  const empresa = config?.empresa || 'Assados do Jeferson';
  const chavePix = config?.chavePix || 'assadosdojeferson@gmail.com';
  const tipoPix = config?.tipoPix || 'Chave E-mail';

  let text = `*${empresa.toUpperCase()}* 🍖🔥\n`;
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

  if (order.formaPagamento === 'PIX' && chavePix) {
    text += `\n🔑 *Chave PIX (${tipoPix}):* \`${chavePix}\`\n`;
  }

  if (order.observacoes) {
    text += `\n📝 *Obs.:* ${order.observacoes}\n`;
  }

  text += `\nObrigado pela preferência! Bom apetite! 😋`;
  return text;
}

export function generateWeightAdjustmentWhatsAppText(order: Order, config?: Partial<StoreConfig>): string {
  const empresa = config?.empresa || 'Assados do Jeferson';
  const chavePix = config?.chavePix || 'assadosdojeferson@gmail.com';

  let text = `Olá, *${order.clienteNome}*! Aqui é dos *${empresa}* 🍖.\n\n`;
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
    text += `🔑 *Chave PIX:* \`${chavePix}\`\n`;
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
    text += `OBS: ${order.observacoes.toUpperCase()}\n`;
  }

  text += `================================\n`;
  return text;
}
