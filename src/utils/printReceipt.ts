import { Order, StoreConfig } from '../types';
import { formatBRL } from './formatters';

export function generateThermalReceiptHtml(
  order: Order,
  config: StoreConfig,
  paperWidth: '80mm' | '58mm' = '80mm'
): string {
  const is58mm = paperWidth === '58mm';
  const widthStyle = is58mm ? '48mm' : '72mm';
  const fontSize = is58mm ? '10px' : '12px';
  const smallFontSize = is58mm ? '8.5px' : '10px';
  const titleFontSize = is58mm ? '13px' : '15px';

  const dateStr = order.criadoEm
    ? new Date(order.criadoEm).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('pt-BR');

  const meatItemsHtml =
    order.carnes && order.carnes.length > 0
      ? order.carnes
          .map(c => {
            const weightDesc = c.pesoRealKg
              ? `Pesado: <strong>${c.pesoRealKg.toFixed(3)} kg</strong>${c.precoKg ? ` (x ${formatBRL(c.precoKg)}/kg)` : ''}`
              : `Qtd: ${c.peso}`;
            const subtotalVal = formatBRL(c.subtotalReal !== undefined ? c.subtotalReal : c.subtotal);
            return `
            <div style="margin-bottom: 5px;">
              <div style="display: flex; justify-content: space-between; font-weight: bold;">
                <span style="flex: 1; padding-right: 4px;">${c.produto}</span>
                <span style="white-space: nowrap;">${subtotalVal}</span>
              </div>
              <div style="font-size: ${smallFontSize}; color: #333;">${weightDesc}</div>
            </div>`;
          })
          .join('')
      : '';

  const sideItemsHtml =
    order.acompanhamentos && order.acompanhamentos.length > 0
      ? order.acompanhamentos
          .map(a => {
            const flavor = a.sabor ? ` (${a.sabor})` : '';
            return `
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="flex: 1; padding-right: 4px;">${a.quantidade}x ${a.produto}${flavor}</span>
              <span style="font-weight: bold; white-space: nowrap;">${formatBRL(a.subtotal)}</span>
            </div>`;
          })
          .join('')
      : '';

  const drinkItemsHtml =
    order.bebidas && order.bebidas.length > 0
      ? order.bebidas
          .map(b => {
            return `
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="flex: 1; padding-right: 4px;">${b.quantidade}x ${b.produto}</span>
              <span style="font-weight: bold; white-space: nowrap;">${formatBRL(b.subtotal)}</span>
            </div>`;
          })
          .join('')
      : '';

  const deliveryAddressHtml =
    order.tipoRecebimento === 'Entrega'
      ? `
      <div style="border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; font-size: ${smallFontSize};">
        <div style="font-weight: bold;">📍 ENDEREÇO DE ENTREGA:</div>
        <div>${order.enderecoRua || ''}, ${order.enderecoNumero || 'S/N'}</div>
        <div><strong>Bairro:</strong> ${order.enderecoBairro || ''}</div>
        ${order.enderecoComplemento ? `<div><strong>Compl:</strong> ${order.enderecoComplemento}</div>` : ''}
        ${order.enderecoReferencia ? `<div><strong>Ref:</strong> ${order.enderecoReferencia}</div>` : ''}
      </div>`
      : '';

  const pixHtml =
    order.formaPagamento === 'PIX' && config.chavePix
      ? `<div style="font-size: ${smallFontSize}; margin-top: 3px; background: #f0f0f0; padding: 3px; border-radius: 3px;">
          <strong>Chave PIX (${config.tipoPix || 'Chave'}):</strong> ${config.chavePix}
          ${config.titularPix ? `<br/><strong>Titular:</strong> ${config.titularPix}` : ''}
        </div>`
      : '';

  const changeHtml =
    order.formaPagamento === 'Dinheiro' && order.trocoPara
      ? `<div style="font-size: ${smallFontSize}; margin-top: 3px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Troco para:</span>
            <span>${formatBRL(order.trocoPara)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>Levar de troco:</span>
            <span>${formatBRL(Math.max(0, order.trocoPara - order.total))}</span>
          </div>
        </div>`
      : '';

  const obsHtml = order.observacoes
    ? `
    <div style="border-top: 1px dashed #000; padding-top: 4px; margin-top: 5px; font-size: ${smallFontSize};">
      <div style="font-weight: bold;">📝 OBSERVAÇÕES:</div>
      <div style="font-style: italic;">${order.observacoes}</div>
    </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Cupom Pedido ${order.numeroPedido} - ${config.empresa}</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 0;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 6px;
      font-family: 'Courier New', Courier, monospace, 'JetBrains Mono', sans-serif;
      font-size: ${fontSize};
      color: #000000;
      background: #ffffff;
      line-height: 1.25;
      width: ${widthStyle};
      max-width: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000000;
      margin: 6px 0;
    }
    .divider-double {
      border-top: 1px double #000000;
      margin: 6px 0;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    @media print {
      body {
        width: ${widthStyle};
        padding: 2mm 3mm;
      }
    }
  </style>
</head>
<body>
  <!-- Cabeçalho da Empresa -->
  <div class="text-center">
    <div style="font-size: ${titleFontSize}; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">
      ${config.empresa}
    </div>
    ${config.telefone ? `<div style="font-size: ${smallFontSize}; font-weight: bold;">Tel: ${config.telefone}</div>` : ''}
    <div style="font-size: ${smallFontSize}; margin-top: 2px; text-transform: uppercase;">
      *** CUPOM NÃO FISCAL ***
    </div>
    <div style="font-size: ${smallFontSize}; color: #444;">
      CONTROLE DE PRODUÇÃO E BALCÃO
    </div>
  </div>

  <div class="divider"></div>

  <!-- Dados do Pedido -->
  <div class="flex-row" style="font-size: ${is58mm ? '11px' : '13px'}; font-weight: 900;">
    <span>PEDIDO:</span>
    <span>${order.numeroPedido}</span>
  </div>
  <div class="flex-row" style="font-size: ${smallFontSize};">
    <span>HORÁRIO PREVISTO:</span>
    <span class="bold">${order.horario}</span>
  </div>
  <div class="flex-row" style="font-size: ${smallFontSize};">
    <span>EMISSÃO:</span>
    <span>${dateStr}</span>
  </div>
  <div class="flex-row" style="font-size: ${smallFontSize}; margin-top: 2px;">
    <span>TIPO:</span>
    <span class="bold" style="text-transform: uppercase; border: 1px solid #000; padding: 0 3px;">
      ${order.tipoRecebimento === 'Entrega' ? '🛵 ENTREGA' : '🛍️ RETIRADA NO BALCÃO'}
    </span>
  </div>

  <div class="divider"></div>

  <!-- Dados do Cliente -->
  <div class="flex-row">
    <span style="font-size: ${smallFontSize};">CLIENTE:</span>
    <span class="bold">${order.clienteNome}</span>
  </div>
  ${
    order.clienteTelefone
      ? `<div class="flex-row" style="font-size: ${smallFontSize};">
          <span>FONE:</span>
          <span>${order.clienteTelefone}</span>
        </div>`
      : ''
  }

  ${deliveryAddressHtml}

  <div class="divider"></div>

  <!-- Itens -->
  <div class="flex-row bold" style="font-size: ${smallFontSize}; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 2px;">
    <span>ITEM / DESCRIÇÃO</span>
    <span>VALOR</span>
  </div>
  <div style="margin-top: 4px;">
    ${meatItemsHtml}
    ${sideItemsHtml}
    ${drinkItemsHtml}
  </div>

  <div class="divider"></div>

  <!-- Valores Financeiros -->
  <div class="flex-row" style="font-size: ${smallFontSize};">
    <span>SUBTOTAL:</span>
    <span>${formatBRL(order.subtotal)}</span>
  </div>
  ${
    order.tipoRecebimento === 'Entrega'
      ? `<div class="flex-row" style="font-size: ${smallFontSize};">
          <span>TAXA ENTREGA:</span>
          <span>${order.taxaEntrega > 0 ? formatBRL(order.taxaEntrega) : 'Grátis'}</span>
        </div>`
      : ''
  }

  <div class="flex-row bold" style="font-size: ${is58mm ? '12px' : '14px'}; margin-top: 3px; padding-top: 3px; border-top: 1px dotted #000;">
    <span>TOTAL A PAGAR:</span>
    <span>${formatBRL(order.total)}</span>
  </div>

  <div class="flex-row bold" style="margin-top: 4px; font-size: ${smallFontSize};">
    <span>FORMA PGTO:</span>
    <span style="text-transform: uppercase;">${order.formaPagamento}</span>
  </div>

  ${pixHtml}
  ${changeHtml}
  ${obsHtml}

  <div class="divider"></div>

  <!-- Rodapé -->
  <div class="text-center" style="font-size: ${smallFontSize}; margin-top: 4px;">
    <div class="bold">Agradecemos a preferência!</div>
    <div style="color: #444;">Assados no ponto certo todo domingo</div>
    <div style="margin-top: 6px; letter-spacing: -1px; color: #888;">
      - - - - - - - - - - - - - - - - - - -
    </div>
  </div>
</body>
</html>`;
}

/**
 * Executes a clean isolated print job using a hidden iframe.
 * This completely avoids parent modal clipping, scrollbar interference, or css conflicts.
 */
export function printThermalReceipt(
  order: Order,
  config: StoreConfig,
  paperWidth: '80mm' | '58mm' = '80mm'
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const htmlContent = generateThermalReceiptHtml(order, config, paperWidth);

      // Look for existing print iframe or create a new one
      let printFrame = document.getElementById('receipt-print-iframe') as HTMLIFrameElement | null;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'receipt-print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.style.visibility = 'hidden';
        printFrame.style.zIndex = '-9999';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (!frameDoc) {
        // Fallback to window.open if iframe doc is unavailable
        openReceiptPrintWindow(order, config, paperWidth);
        resolve(true);
        return;
      }

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame?.contentWindow?.focus();
          printFrame?.contentWindow?.print();
          resolve(true);
        } catch (printErr) {
          console.warn('Iframe print failed, opening in new window:', printErr);
          openReceiptPrintWindow(order, config, paperWidth);
          resolve(true);
        }
      }, 250);
    } catch (e) {
      console.error('Error triggering receipt print:', e);
      openReceiptPrintWindow(order, config, paperWidth);
      resolve(false);
    }
  });
}

/**
 * Opens a clean printable receipt in a new tab/window with manual print option.
 */
export function openReceiptPrintWindow(
  order: Order,
  config: StoreConfig,
  paperWidth: '80mm' | '58mm' = '80mm'
): void {
  const htmlContent = generateThermalReceiptHtml(order, config, paperWidth);
  const printWindow = window.open('', '_blank', 'width=450,height=700,menubar=no,toolbar=no,location=no,status=no');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  }
}

/**
 * Generates a clean text receipt for downloading (.txt)
 */
export function downloadReceiptTxt(order: Order, config: StoreConfig): void {
  const isEntrega = order.tipoRecebimento === 'Entrega';
  let lines: string[] = [];
  lines.push(`================================`);
  lines.push(`     ${(config.empresa || 'ASSADOS DO JEFERSON').toUpperCase()}`);
  if (config.telefone) lines.push(`     Tel: ${config.telefone}`);
  lines.push(`     *** CUPOM NÃO FISCAL ***`);
  lines.push(`================================`);
  lines.push(`PEDIDO: ${order.numeroPedido}`);
  lines.push(`HORÁRIO: ${order.horario}`);
  lines.push(`TIPO: ${isEntrega ? 'ENTREGA' : 'RETIRADA NO BALCÃO'}`);
  lines.push(`CLIENTE: ${order.clienteNome}`);
  if (order.clienteTelefone) lines.push(`FONE: ${order.clienteTelefone}`);

  if (isEntrega) {
    lines.push(`--------------------------------`);
    lines.push(`ENDEREÇO:`);
    lines.push(`${order.enderecoRua || ''}, ${order.enderecoNumero || 'S/N'}`);
    lines.push(`Bairro: ${order.enderecoBairro || ''}`);
    if (order.enderecoComplemento) lines.push(`Compl: ${order.enderecoComplemento}`);
    if (order.enderecoReferencia) lines.push(`Ref: ${order.enderecoReferencia}`);
  }

  lines.push(`--------------------------------`);
  lines.push(`ITENS DO PEDIDO:`);
  if (order.carnes && order.carnes.length > 0) {
    order.carnes.forEach(c => {
      const w = c.pesoRealKg ? `Pesado: ${c.pesoRealKg.toFixed(3)}kg` : `Qtd: ${c.peso}`;
      const sub = formatBRL(c.subtotalReal !== undefined ? c.subtotalReal : c.subtotal);
      lines.push(`- ${c.produto}`);
      lines.push(`  ${w} = ${sub}`);
    });
  }

  if (order.acompanhamentos && order.acompanhamentos.length > 0) {
    order.acompanhamentos.forEach(a => {
      const flavor = a.sabor ? ` (${a.sabor})` : '';
      lines.push(`- ${a.quantidade}x ${a.produto}${flavor} = ${formatBRL(a.subtotal)}`);
    });
  }

  if (order.bebidas && order.bebidas.length > 0) {
    order.bebidas.forEach(b => {
      lines.push(`- ${b.quantidade}x ${b.produto} = ${formatBRL(b.subtotal)}`);
    });
  }

  lines.push(`--------------------------------`);
  lines.push(`Subtotal: ${formatBRL(order.subtotal)}`);
  if (isEntrega) lines.push(`Taxa Entrega: ${order.taxaEntrega > 0 ? formatBRL(order.taxaEntrega) : 'Grátis'}`);
  lines.push(`TOTAL A PAGAR: ${formatBRL(order.total)}`);
  lines.push(`Forma Pgto: ${order.formaPagamento}`);
  if (order.formaPagamento === 'PIX' && config.chavePix) {
    lines.push(`Chave PIX (${config.tipoPix || 'Chave'}): ${config.chavePix}`);
  }
  if (order.formaPagamento === 'Dinheiro' && order.trocoPara) {
    lines.push(`Troco para: ${formatBRL(order.trocoPara)} (Levar: ${formatBRL(Math.max(0, order.trocoPara - order.total))})`);
  }
  if (order.observacoes) {
    lines.push(`Obs: ${order.observacoes}`);
  }
  lines.push(`================================`);
  lines.push(`   Agradecemos a preferência!`);
  lines.push(`================================`);

  const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cupom-${order.numeroPedido.replace(/[^a-zA-Z0-9_-]/g, '')}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
