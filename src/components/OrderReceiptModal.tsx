import React, { useState, useEffect } from 'react';
import { Order, StoreConfig } from '../types';
import { formatBRL, generateWhatsAppReceiptText } from '../utils/formatters';
import {
  printThermalReceipt,
  openReceiptPrintWindow,
  downloadReceiptTxt
} from '../utils/printReceipt';
import {
  Printer,
  Copy,
  Check,
  X,
  Flame,
  MessageSquare,
  Sparkles,
  Sliders,
  CheckCircle2,
  FileText,
  ExternalLink,
  Download,
  CheckCheck
} from 'lucide-react';

interface OrderReceiptModalProps {
  order: Order;
  config: StoreConfig;
  onClose: () => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  order,
  config,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccessToast, setPrintSuccessToast] = useState(false);

  // Trigger isolated iframe print (zero modal clipping, works inside any iframe or device)
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printThermalReceipt(order, config, paperWidth);
      setPrintSuccessToast(true);
      setTimeout(() => setPrintSuccessToast(false), 3500);
    } catch (err) {
      console.error('Error printing receipt:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenNewWindow = () => {
    openReceiptPrintWindow(order, config, paperWidth);
  };

  const handleDownloadTxt = () => {
    downloadReceiptTxt(order, config);
  };

  // Keyboard shortcut: Escape to close, Ctrl+P to print
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, paperWidth, order, config]);

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppReceiptText(order);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const customerPhoneClean = (order.clienteTelefone || '').replace(/\D/g, '');
  const waReceiptText = generateWhatsAppReceiptText(order);
  const directWhatsAppUrl = customerPhoneClean
    ? `https://wa.me/55${customerPhoneClean}?text=${encodeURIComponent(waReceiptText)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm no-print-modal-backdrop">
      <div className="relative w-full max-w-lg bg-[#121218] border border-[#262636] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#20202e] flex items-center justify-between bg-[#161622] no-print">
          <div className="flex items-center gap-2 text-stone-100 font-bold text-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-stone-100 font-display">Recibo & Impressão Térmica</span>
              <span className="block text-[11px] text-stone-400 font-normal">
                Pedido {order.numeroPedido} • {order.clienteNome}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 hover:bg-[#232333] rounded-xl transition"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size Selector Controls */}
        <div className="px-5 py-3 bg-[#181824] border-b border-[#222232] flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-1.5 text-xs text-stone-300 font-semibold">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Formato da Impressora:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0f0f16] p-1 rounded-xl border border-[#2c2c40]">
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                paperWidth === '80mm'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              80mm (Padrão POS)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                paperWidth === '58mm'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              58mm (Mini Térmica)
            </button>
          </div>
        </div>

        {/* Modal Body / Thermal Paper Live Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0a0e] flex justify-center items-start">
          <div
            id="thermal-receipt-printable"
            className={`bg-white text-black font-mono shadow-2xl transition-all duration-200 paper-${paperWidth} ${
              paperWidth === '80mm'
                ? 'w-[320px] p-5 text-xs rounded-xl'
                : 'w-[240px] p-3 text-[10px] rounded-lg'
            }`}
          >
            {/* Header / Store Info */}
            <div className="text-center pb-2.5 border-b border-dashed border-neutral-700 space-y-1">
              <h2 className="font-extrabold text-sm sm:text-base tracking-wider uppercase leading-tight">
                {config.empresa}
              </h2>
              {config.telefone && (
                <p className="text-[11px] font-bold text-neutral-800">
                  Tel: {config.telefone}
                </p>
              )}
              <div className="pt-0.5">
                <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-600 block">
                  *** CUPOM NÃO FISCAL ***
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  CONTROLE DE PRODUÇÃO E BALCÃO
                </span>
              </div>
            </div>

            {/* Order Metadata */}
            <div className="py-2 border-b border-dashed border-neutral-700 space-y-0.5 leading-snug">
              <div className="flex justify-between font-extrabold text-[12px]">
                <span>PEDIDO:</span>
                <span>{order.numeroPedido}</span>
              </div>
              <div className="flex justify-between">
                <span>DATA/HORA:</span>
                <span>{order.horario}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>TIPO:</span>
                <span className="uppercase px-1 bg-neutral-200 rounded">
                  {order.tipoRecebimento === 'Entrega' ? '🛵 ENTREGA' : '🛍️ RETIRADA NO BALCÃO'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-dotted border-neutral-300">
                <span>CLIENTE:</span>
                <span className="font-bold">{order.clienteNome}</span>
              </div>
              {order.clienteTelefone && (
                <div className="flex justify-between">
                  <span>TELEFONE:</span>
                  <span>{order.clienteTelefone}</span>
                </div>
              )}

              {/* Delivery Address (if applicable) */}
              {order.tipoRecebimento === 'Entrega' && (
                <div className="pt-1.5 mt-1 text-[10.5px] border-t border-dotted border-neutral-300 space-y-0.5">
                  <p className="font-bold">ENDEREÇO DE ENTREGA:</p>
                  <p>
                    {order.enderecoRua}, {order.enderecoNumero}
                  </p>
                  <p>
                    <strong>Bairro:</strong> {order.enderecoBairro}
                  </p>
                  {order.enderecoComplemento && (
                    <p>
                      <strong>Compl:</strong> {order.enderecoComplemento}
                    </p>
                  )}
                  {order.enderecoReferencia && (
                    <p>
                      <strong>Ref:</strong> {order.enderecoReferencia}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Items / Products Section */}
            <div className="py-2.5 border-b border-dashed border-neutral-700 space-y-2">
              <div className="flex justify-between font-extrabold text-[10.5px] border-b border-neutral-300 pb-1 uppercase">
                <span>ITEM / DESCRIÇÃO</span>
                <span>VALOR (R$)</span>
              </div>

              {/* Carnes Assadas */}
              {order.carnes && order.carnes.length > 0 && (
                <div className="space-y-1.5">
                  {order.carnes.map((c, i) => (
                    <div key={i} className="flex justify-between items-start leading-tight">
                      <div className="flex-1 pr-2">
                        <p className="font-bold">{c.produto}</p>
                        <p className="text-[10px] text-neutral-700">
                          {c.pesoRealKg ? (
                            <>
                              <span className="font-bold">Pesado: {c.pesoRealKg.toFixed(3)} kg</span>
                              {c.precoKg ? ` (x ${formatBRL(c.precoKg)}/kg)` : ''}
                            </>
                          ) : (
                            <>Qtd Solicitada: {c.peso}</>
                          )}
                        </p>
                      </div>
                      <span className="font-bold whitespace-nowrap">
                        {formatBRL(c.subtotalReal !== undefined ? c.subtotalReal : c.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Acompanhamentos */}
              {order.acompanhamentos && order.acompanhamentos.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-dotted border-neutral-300">
                  {order.acompanhamentos.map((a, i) => (
                    <div key={i} className="flex justify-between items-start leading-tight">
                      <span className="flex-1 pr-2">
                        {a.quantidade}x {a.produto}
                        {a.sabor ? ` (${a.sabor})` : ''}
                      </span>
                      <span className="font-semibold whitespace-nowrap">
                        {formatBRL(a.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bebidas */}
              {order.bebidas && order.bebidas.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-dotted border-neutral-300">
                  {order.bebidas.map((b, i) => (
                    <div key={i} className="flex justify-between items-start leading-tight">
                      <span className="flex-1 pr-2">
                        {b.quantidade}x {b.produto}
                      </span>
                      <span className="font-semibold whitespace-nowrap">
                        {formatBRL(b.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Totals */}
            <div className="py-2 border-b border-dashed border-neutral-700 space-y-1 leading-snug">
              <div className="flex justify-between text-neutral-800">
                <span>SUBTOTAL:</span>
                <span>{formatBRL(order.subtotal)}</span>
              </div>

              {order.tipoRecebimento === 'Entrega' && (
                <div className="flex justify-between text-neutral-800">
                  <span>TAXA DE ENTREGA:</span>
                  <span>{order.taxaEntrega > 0 ? formatBRL(order.taxaEntrega) : 'Grátis'}</span>
                </div>
              )}

              <div className="flex justify-between text-[13px] font-extrabold pt-1 border-t border-dotted border-neutral-400">
                <span>TOTAL A PAGAR:</span>
                <span>{formatBRL(order.total)}</span>
              </div>

              <div className="flex justify-between pt-1 border-t border-dotted border-neutral-300 font-bold">
                <span>FORMA DE PGTO:</span>
                <span className="uppercase">{order.formaPagamento}</span>
              </div>

              {order.formaPagamento === 'PIX' && config.chavePix && (
                <div className="text-[9.5px] text-neutral-700 pt-0.5">
                  <span>Chave PIX: {config.chavePix} ({config.tipoPix || 'Chave'})</span>
                </div>
              )}

              {order.formaPagamento === 'Dinheiro' && order.trocoPara && (
                <div className="pt-1 text-[10px] space-y-0.5 text-neutral-800">
                  <div className="flex justify-between">
                    <span>TROCO PARA:</span>
                    <span>{formatBRL(order.trocoPara)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>LEVAR DE TROCO:</span>
                    <span>{formatBRL(Math.max(0, order.trocoPara - order.total))}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Special Instructions / Notes */}
            {order.observacoes && (
              <div className="py-2 border-b border-dashed border-neutral-700 text-[10px] space-y-0.5">
                <p className="font-bold">OBSERVAÇÕES DO CLIENTE:</p>
                <p className="italic text-neutral-800">{order.observacoes}</p>
              </div>
            )}

            {/* Thermal Footer */}
            <div className="pt-3 text-center space-y-1">
              <p className="font-bold text-[10.5px]">Agradecemos a preferência!</p>
              <p className="text-[9px] text-neutral-600">Assados no ponto certo todo domingo</p>
              <p className="text-[8.5px] text-neutral-400 pt-1 font-mono tracking-tighter">
                - - - - - - - - - - - - - - - - - - - - - - - -
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-[#20202e] bg-[#161622] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 py-2.5 px-3 bg-[#222232] hover:bg-[#2c2c40] text-stone-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              title="Copiar texto formatado do recibo para WhatsApp"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 py-2.5 px-3 bg-[#222232] hover:bg-[#2c2c40] text-stone-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              title="Baixar cupom em formato texto puro (.TXT)"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Baixar (.TXT)</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewWindow}
              className="hidden sm:flex items-center gap-1.5 py-2.5 px-3 bg-[#222232] hover:bg-[#2c2c40] text-stone-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              title="Abrir recibo limpo em nova janela para imprimir ou salvar como PDF"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span>Nova Janela / PDF</span>
            </button>

            {directWhatsAppUrl && (
              <a
                href={directWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 py-2.5 px-3 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-xl transition"
                title="Abrir conversa no WhatsApp com o recibo preenchido"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>

          {/* Primary Action: Print Order */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-extrabold rounded-xl transition shadow-lg shadow-amber-950/50 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Gerando Impressão...' : `Imprimir Pedido (${paperWidth})`}</span>
            </button>
          </div>
        </div>

        {/* Feedback toast when print is dispatched */}
        {printSuccessToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-500/60 text-emerald-200 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Documento enviado para a impressora!</span>
          </div>
        )}
      </div>
    </div>
  );
};
