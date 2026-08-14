import React, { useEffect, useState } from 'react';
import { Order, StoreConfig } from '../types';
import { formatBRL, generateWhatsAppReceiptText } from '../../server/chatbotEngine';
import {
  Printer,
  Copy,
  Check,
  QrCode,
  MapPin,
  Clock,
  CreditCard,
  Phone,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Receipt
} from 'lucide-react';
import QRCode from 'qrcode';

interface InlineChatReceiptProps {
  order: Order;
  config: StoreConfig;
  onOpenFullModal?: (order: Order) => void;
  defaultExpanded?: boolean;
}

export const InlineChatReceipt: React.FC<InlineChatReceiptProps> = ({
  order,
  config,
  onOpenFullModal,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (order && order.formaPagamento === 'PIX') {
      const pixPayload = `00020126330014BR.GOV.BCB.PIX0114${config.chavePix}520400005303986540${order.total.toFixed(2)}5802BR5920${config.empresa}6009JOINVILLE62070503***6304`;
      QRCode.toDataURL(pixPayload, { width: 140, margin: 1 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('Error generating inline QR Code:', err));
    }
  }, [order, config]);

  const receiptText = generateWhatsAppReceiptText(order);

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(receiptText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyPix = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(config.chavePix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.print();
  };

  return (
    <div className="w-full mt-3 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 font-sans-clean border border-amber-900/40">
      {/* Receipt Header Banner / Toggle Button */}
      <button
        type="button"
        id={`btn-toggle-cupom-${order.numeroPedido}`}
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-stone-950 font-bold text-xs transition active:scale-[0.99] shadow-inner"
      >
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-stone-950" />
          <span className="tracking-wide">
            {isExpanded ? '🧾 Cupom do Pedido Gerado na Conversa' : '🧾 Ver Cupom do Pedido na Conversa'}
          </span>
          <span className="bg-stone-950/20 text-stone-950 text-[10px] px-1.5 py-0.5 rounded font-mono-clean font-black">
            #{order.numeroPedido}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold underline">
            {isExpanded ? 'Minimizar' : 'Visualizar'}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Thermal Slip */}
      {isExpanded && (
        <div className="bg-[#fbf9f4] text-stone-900 p-4 font-mono-clean text-xs leading-relaxed border-t border-dashed border-stone-300 select-text">
          {/* Top Zig-Zag decorative line */}
          <div className="text-center pb-2 border-b border-dashed border-stone-400 space-y-0.5">
            <h4 className="font-black text-sm tracking-wider uppercase text-stone-950">
              {config.empresa}
            </h4>
            <p className="text-[10px] text-stone-600 font-sans-clean">
              CUPOM DE PEDIDO (NÃO FISCAL)
            </p>
            <p className="text-[10px] text-stone-600">
              WhatsApp: {config.telefone}
            </p>
          </div>

          {/* Header Data */}
          <div className="py-2 border-b border-dashed border-stone-400 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="font-bold text-stone-700">PEDIDO:</span>
              <span className="font-black text-stone-950">#{order.numeroPedido}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>DATA/HORA:</span>
              <span>{order.criadoEm ? new Date(order.criadoEm).toLocaleDateString('pt-BR') + ' ' + order.horario : order.horario}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-stone-700">CLIENTE:</span>
              <span className="font-bold text-stone-950">{order.clienteNome}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>FONE:</span>
              <span>{order.clienteTelefone}</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1.5">
            <p className="font-bold text-[10px] uppercase tracking-wider text-stone-800">
              ITENS DO PEDIDO:
            </p>

            {/* Carnes */}
            {order.carnes.map((c, i) => (
              <div key={`c-${i}`} className="flex justify-between items-start text-[11px]">
                <div className="pr-2">
                  <span className="font-bold text-stone-950">{c.produto}</span>
                  <span className="text-stone-600 block text-[9px]">
                    {c.peso} • ({formatBRL(c.precoKg)}/kg)
                  </span>
                </div>
                <span className="font-bold text-stone-950 shrink-0">{formatBRL(c.subtotal)}</span>
              </div>
            ))}

            {/* Acompanhamentos */}
            {order.acompanhamentos.map((a, i) => (
              <div key={`a-${i}`} className="flex justify-between items-start text-[11px]">
                <div>
                  <span className="text-stone-900">{a.quantidade}x {a.produto}</span>
                </div>
                <span className="font-semibold text-stone-950">{formatBRL(a.subtotal)}</span>
              </div>
            ))}

            {/* Bebidas */}
            {order.bebidas.map((b, i) => (
              <div key={`b-${i}`} className="flex justify-between items-start text-[11px]">
                <div>
                  <span className="text-stone-900">{b.quantidade}x {b.produto}{b.sabor ? ` (${b.sabor})` : ''}</span>
                </div>
                <span className="font-semibold text-stone-950">{formatBRL(b.subtotal)}</span>
              </div>
            ))}
          </div>

          {/* Delivery Details */}
          <div className="py-2 border-b border-dashed border-stone-400 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="font-semibold text-stone-700">TIPO:</span>
              <span className="font-bold text-stone-950 uppercase">{order.tipoRecebimento}</span>
            </div>
            {order.tipoRecebimento === 'Entrega' ? (
              <div className="text-[10px] text-stone-700 space-y-0.5 mt-1 bg-stone-100 p-1.5 rounded border border-stone-300/60">
                <p className="font-bold text-stone-900">ENDEREÇO:</p>
                <p>{order.enderecoRua}, nº {order.enderecoNumero}</p>
                <p>Bairro: {order.enderecoBairro}{order.enderecoComplemento ? ` (${order.enderecoComplemento})` : ''}</p>
                {order.enderecoReferencia && (
                  <p className="text-amber-900 font-bold">📌 Ref: {order.enderecoReferencia}</p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-stone-600">Retirada no balcão da loja</p>
            )}
            <div className="flex justify-between pt-1">
              <span className="font-semibold text-stone-700">HORÁRIO:</span>
              <span className="font-bold text-stone-950">{order.horario}</span>
            </div>
          </div>

          {/* Totals & Payment */}
          <div className="py-2 border-b border-dashed border-stone-400 space-y-0.5 text-[11px]">
            <div className="flex justify-between text-stone-600">
              <span>SUBTOTAL:</span>
              <span>{formatBRL(order.subtotal)}</span>
            </div>
            {order.tipoRecebimento === 'Entrega' && (
              <div className="flex justify-between text-stone-600">
                <span>TAXA DE ENTREGA:</span>
                <span>{formatBRL(order.taxaEntrega)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-950 font-black text-xs pt-1 border-t border-stone-300">
              <span>TOTAL A PAGAR:</span>
              <span>{formatBRL(order.total)}</span>
            </div>
            <div className="flex justify-between text-stone-700 pt-1 text-[10px]">
              <span>PAGAMENTO:</span>
              <span className="font-bold text-stone-950 uppercase">
                {order.formaPagamento}{order.trocoPara ? ` (Troco: ${formatBRL(order.trocoPara)})` : ''}
              </span>
            </div>
          </div>

          {/* QR Code if PIX */}
          {order.formaPagamento === 'PIX' && (
            <div className="py-2.5 border-b border-dashed border-stone-400 text-center space-y-1.5 bg-amber-500/5 p-2 rounded-xl my-1 border border-amber-900/10">
              <p className="font-bold text-[10px] text-stone-900 uppercase tracking-wider flex items-center justify-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-amber-700" />
                PAGAMENTO VIA PIX
              </p>
              {qrCodeUrl && (
                <div className="flex justify-center my-1">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code PIX"
                    className="w-28 h-28 border-2 border-stone-800 rounded-lg shadow-sm"
                  />
                </div>
              )}
              <div className="text-[10px] space-y-1">
                <p className="text-stone-600">Chave ({config.tipoPix}):</p>
                <div className="flex items-center justify-center gap-1">
                  <code className="bg-stone-200 text-stone-900 px-1.5 py-0.5 rounded font-mono font-bold text-[9px] max-w-[170px] truncate">
                    {config.chavePix}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="p-1 bg-stone-800 text-stone-100 hover:bg-stone-900 rounded text-[9px] font-sans-clean flex items-center gap-0.5 transition active:scale-95"
                    title="Copiar Chave PIX"
                  >
                    {copiedPix ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-2 text-center text-[10px] text-stone-600 space-y-0.5">
            <p className="font-bold text-stone-800">OBRIGADO PELA PREFERÊNCIA!</p>
            <p>Seu pedido está sendo preparado com todo carinho. 🍖🔥</p>
          </div>

          {/* Action Bar on Ticket */}
          <div className="mt-3 pt-2.5 border-t border-stone-300 grid grid-cols-3 gap-1.5 font-sans-clean text-[10px]">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1 py-1.5 bg-stone-800 hover:bg-stone-900 text-stone-100 rounded-lg transition font-medium active:scale-95"
            >
              <Printer className="w-3 h-3" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center justify-center gap-1 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg transition font-medium active:scale-95"
            >
              {copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedText ? 'Copiado' : 'Copiar'}</span>
            </button>

            {onOpenFullModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFullModal(order);
                }}
                className="flex items-center justify-center gap-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg transition active:scale-95"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Ampliar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
