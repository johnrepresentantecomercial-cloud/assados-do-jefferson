import { Order } from '../types';

/**
 * Escapes CSV fields to handle quotes, semicolons, and newlines safely.
 */
function escapeCSVField(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '""';
  const stringField = String(field);
  // If field contains quotes, semicolons, commas, or linebreaks, enclose in quotes and escape internal quotes
  const escaped = stringField.replace(/"/g, '""').replace(/\r?\n/g, ' ');
  return `"${escaped}"`;
}

/**
 * Exports a list of orders to a clean CSV formatted for Brazilian accounting & Excel.
 * Uses semicolon (;) separator and \uFEFF UTF-8 BOM for perfect Excel compatibility.
 */
export function exportOrdersToCSV(orders: Order[], filenamePrefix = 'pedidos_assados_jeferson'): void {
  if (!orders || orders.length === 0) {
    alert('Nenhum pedido na lista filtrada para exportar.');
    return;
  }

  const headers = [
    'Numero do Pedido',
    'Data Criacao',
    'Horario Agendado',
    'Status',
    'Cliente',
    'Telefone',
    'Tipo Recebimento',
    'Bairro',
    'Endereco Completo',
    'Carnes e Pesos',
    'Acompanhamentos',
    'Bebidas',
    'Subtotal (R$)',
    'Taxa Entrega (R$)',
    'Total Pedido (R$)',
    'Forma de Pagamento',
    'Troco Para (R$)',
    'Lancado no Caixa',
    'Origem',
    'Observacoes'
  ];

  const rows: string[] = [];
  rows.push(headers.map(h => `"${h}"`).join(';'));

  orders.forEach(order => {
    const dataCriacao = order.criadoEm
      ? new Date(order.criadoEm).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '';

    // Description of meats
    const carnesDesc = (order.carnes || [])
      .map(c => {
        const peso = c.pesoRealKg
          ? `${c.pesoRealKg.toFixed(3).replace('.', ',')} kg (real)`
          : c.peso;
        const sub = c.subtotalReal || c.subtotal;
        return `${c.produto} (${peso}: R$ ${sub.toFixed(2).replace('.', ',')})`;
      })
      .join(' | ');

    // Description of side dishes
    const acompDesc = (order.acompanhamentos || [])
      .map(a => `${a.quantidade}x ${a.produto}${a.sabor ? ` [${a.sabor}]` : ''} (R$ ${a.subtotal.toFixed(2).replace('.', ',')})`)
      .join(' | ');

    // Description of drinks
    const bebidasDesc = (order.bebidas || [])
      .map(b => `${b.quantidade}x ${b.produto} (R$ ${b.subtotal.toFixed(2).replace('.', ',')})`)
      .join(' | ');

    // Full address
    let fullEndereco = '';
    if (order.tipoRecebimento === 'Entrega') {
      const parts = [
        order.enderecoRua ? `${order.enderecoRua}, ${order.enderecoNumero || 'S/N'}` : '',
        order.enderecoBairro ? `Bairro: ${order.enderecoBairro}` : '',
        order.enderecoComplemento ? `Compl: ${order.enderecoComplemento}` : '',
        order.enderecoReferencia ? `Ref: ${order.enderecoReferencia}` : ''
      ].filter(Boolean);
      fullEndereco = parts.join(' - ');
    } else {
      fullEndereco = 'Retirada no Balcão';
    }

    const row = [
      escapeCSVField(order.numeroPedido),
      escapeCSVField(dataCriacao),
      escapeCSVField(order.horario),
      escapeCSVField(order.status),
      escapeCSVField(order.clienteNome),
      escapeCSVField(order.clienteTelefone),
      escapeCSVField(order.tipoRecebimento),
      escapeCSVField(order.enderecoBairro || (order.tipoRecebimento === 'Retirada' ? 'Balcão' : '')),
      escapeCSVField(fullEndereco),
      escapeCSVField(carnesDesc),
      escapeCSVField(acompDesc),
      escapeCSVField(bebidasDesc),
      escapeCSVField((order.subtotal || 0).toFixed(2).replace('.', ',')),
      escapeCSVField((order.taxaEntrega || 0).toFixed(2).replace('.', ',')),
      escapeCSVField((order.total || 0).toFixed(2).replace('.', ',')),
      escapeCSVField(order.formaPagamento),
      escapeCSVField(order.trocoPara ? order.trocoPara.toFixed(2).replace('.', ',') : ''),
      escapeCSVField(order.lancadoNoCaixa ? 'SIM' : 'NÃO'),
      escapeCSVField(order.origem || 'Web'),
      escapeCSVField(order.observacoes || '')
    ];

    rows.push(row.join(';'));
  });

  // Include UTF-8 Byte Order Mark (\uFEFF) for Excel compatibility
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${dateStr}.csv`;

  // Create temporary link and download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports cash register transactions to a CSV file for financial/accounting tracking.
 */
export function exportCashTransactionsToCSV(
  transactions: import('../types').CashTransaction[],
  filenamePrefix = 'movimentacoes_caixa'
): void {
  if (!transactions || transactions.length === 0) {
    alert('Nenhuma movimentação no caixa para exportar.');
    return;
  }

  const headers = [
    'ID Movimentacao',
    'Data e Hora',
    'Tipo',
    'Categoria',
    'Valor (R$)',
    'Forma de Pagamento',
    'Descricao',
    'ID Pedido Vinculado'
  ];

  const rows: string[] = [];
  rows.push(headers.map(h => `"${h}"`).join(';'));

  transactions.forEach(tx => {
    const row = [
      escapeCSVField(tx.id),
      escapeCSVField(tx.dataHora),
      escapeCSVField(tx.tipo),
      escapeCSVField(tx.categoria),
      escapeCSVField((tx.valor || 0).toFixed(2).replace('.', ',')),
      escapeCSVField(tx.formaPagamento),
      escapeCSVField(tx.descricao),
      escapeCSVField(tx.pedidoId || '')
    ];
    rows.push(row.join(';'));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${dateStr}.csv`;

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

