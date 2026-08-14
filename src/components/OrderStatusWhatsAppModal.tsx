import React, { useState, useEffect } from 'react';
import { Order, StoreConfig, OrderStatus } from '../types';
import { generateOrderStatusNotification, generateWhatsAppReceiptText, generateWeightAdjustmentWhatsAppText, formatBRL } from '../utils/formatters';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Send,
  ExternalLink,
  QrCode,
  Sparkles,
  Phone,
  Flame,
  Truck,
  Building2,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface OrderStatusWhatsAppModalProps {
  order: Order;
  config: StoreConfig;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
}

export const OrderStatusWhatsAppModal: React.FC<OrderStatusWhatsAppModalProps> = ({
  order,
  config,
  onClose,
  onUpdateStatus
}) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);
  const [templateType, setTemplateType] = useState<'STATUS' | 'BALANCA' | 'PIX_CHAVE' | 'COMPROVANTE'>('STATUS');
  const [includePixKey, setIncludePixKey] = useState<boolean>(order.formaPagamento === 'PIX');
  const [customText, setCustomText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Generate text when options change
  useEffect(() => {
    let text = '';
    if (templateType === 'STATUS') {
      text = generateOrderStatusNotification(order, selectedStatus, config, includePixKey);
    } else if (templateType === 'BALANCA') {
      text = generateWeightAdjustmentWhatsAppText(order, config);
      if (includePixKey && !text.includes('Chave PIX')) {
        text += `\n\n🔑 *Chave PIX (${config.tipoPix || 'Chave'}):* \`${config.chavePix}\`\n💰 *Valor:* *${formatBRL(order.total)}*`;
      }
    } else if (templateType === 'PIX_CHAVE') {
      const empresa = config.empresa || 'Assados do Jeferson';
      const chavePix = config.chavePix || 'assadosdojeferson@gmail.com';
      const tipoPix = config.tipoPix || 'Chave E-mail';
      const titular = config.titularPix || empresa;

      text = `Olá, *${order.clienteNome}*! Seguem os dados para pagamento via *PIX* do seu pedido *${order.numeroPedido}* no *${empresa}* 🍖🔥:\n\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💰 *VALOR A TRANSFERIR:* *${formatBRL(order.total)}*\n`;
      text += `🔑 *Chave PIX (${tipoPix}):* \`${chavePix}\`\n`;
      if (titular) text += `👤 *Titular / Favorecido:* ${titular}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
      text += `📲 *Por favor, envie o comprovante da transferência por aqui para confirmarmos imediatamente!* 👍`;
    } else if (templateType === 'COMPROVANTE') {
      text = generateWhatsAppReceiptText(order, config);
    }
    setCustomText(text);
  }, [order, config, selectedStatus, templateType, includePixKey]);

  // Clean phone number for WhatsApp link
  const rawPhone = (order.clienteTelefone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.startsWith('55')
    ? rawPhone
    : rawPhone.length >= 10
    ? `55${rawPhone}`
    : rawPhone;

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    // If status changed and updater exists, update status
    if (onUpdateStatus && selectedStatus !== order.status) {
      onUpdateStatus(order.id, selectedStatus);
    }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#121218] border border-[#272738] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#20202e] bg-[#161622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-stone-100">
                  Notificar Cliente via WhatsApp
                </h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg">
                  {order.numeroPedido}
                </span>
              </div>
              <p className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                <span>Cliente: <strong>{order.clienteNome}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  {order.clienteTelefone}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 hover:bg-[#202030] rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Templates & Status Fast Selectors */}
          <div className="space-y-2">
            <label className="text-stone-300 font-bold flex items-center justify-between">
              <span>Selecione a Notificação / Status:</span>
              <span className="text-[11px] text-stone-400 font-normal">
                Status Atual do Pedido: <strong className="text-amber-400">{order.status}</strong>
              </span>
            </label>

            {/* Template Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTemplateType('STATUS');
                  setSelectedStatus('CONFIRMADO');
                }}
                className={`p-2.5 rounded-xl font-bold border transition text-center flex flex-col items-center gap-1 ${
                  templateType === 'STATUS' && selectedStatus === 'CONFIRMADO'
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500 shadow-md'
                    : 'bg-[#181824] text-stone-400 border-[#252538] hover:border-purple-500/40'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                <span>Confirmado</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTemplateType('STATUS');
                  setSelectedStatus('EM_PREPARACAO');
                }}
                className={`p-2.5 rounded-xl font-bold border transition text-center flex flex-col items-center gap-1 ${
                  templateType === 'STATUS' && selectedStatus === 'EM_PREPARACAO'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500 shadow-md'
                    : 'bg-[#181824] text-stone-400 border-[#252538] hover:border-amber-500/40'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Em Preparo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTemplateType('STATUS');
                  setSelectedStatus('PRONTO');
                }}
                className={`p-2.5 rounded-xl font-bold border transition text-center flex flex-col items-center gap-1 ${
                  templateType === 'STATUS' && selectedStatus === 'PRONTO'
                    ? 'bg-teal-950/80 text-teal-300 border-teal-500 shadow-md'
                    : 'bg-[#181824] text-stone-400 border-[#252538] hover:border-teal-500/40'
                }`}
              >
                <Building2 className="w-4 h-4 text-teal-400" />
                <span>Pronto / Retirada</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTemplateType('STATUS');
                  setSelectedStatus('SAIU_PARA_ENTREGA');
                }}
                className={`p-2.5 rounded-xl font-bold border transition text-center flex flex-col items-center gap-1 ${
                  templateType === 'STATUS' && selectedStatus === 'SAIU_PARA_ENTREGA'
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 shadow-md'
                    : 'bg-[#181824] text-stone-400 border-[#252538] hover:border-cyan-500/40'
                }`}
              >
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>Saiu Entrega</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTemplateType('PIX_CHAVE');
                  setIncludePixKey(true);
                }}
                className={`p-2.5 rounded-xl font-bold border transition text-center flex items-center justify-center gap-2 ${
                  templateType === 'PIX_CHAVE'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-md'
                    : 'bg-[#181824] text-stone-400 border-[#252538] hover:border-emerald-500/40'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Cobrança PIX</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('BALANCA')}
                className={`p-2.5 rounded-xl font-bold border transition text-center flex items-center justify-center gap-2 ${
                  templateType === 'BALANCA'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500 shadow-md'
                    : 'bg-[#181824] text-stone-400 border-[#252538] hover:border-amber-500/40'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Pesagem Balança</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('COMPROVANTE')}
                className={`p-2.5 rounded-xl font-bold border transition text-center flex items-center justify-center gap-2 ${
                  templateType === 'COMPROVANTE'
                    ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500 shadow-md'
                    : 'bg-[#181824] text-stone-400 border-[#252538] hover:border-indigo-500/40'
                }`}
              >
                <span>Comprovante</span>
              </button>
            </div>
          </div>

          {/* PIX Key Toggle Option */}
          <div className="p-3 bg-[#171724] border border-[#27273c] rounded-2xl flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includePixKey}
                onChange={(e) => setIncludePixKey(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 accent-emerald-500"
              />
              <span className="font-semibold text-stone-200">
                Incluir Chave PIX e Instruções de Pagamento na Mensagem
              </span>
            </label>
            <span className="font-mono font-bold text-emerald-400 text-xs">
              {formatBRL(order.total)}
            </span>
          </div>

          {/* Message Preview Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-stone-300">
              <label className="font-bold flex items-center gap-1.5">
                <span>Mensagem Formatada do WhatsApp:</span>
              </label>
              <span className="text-[11px] text-stone-500">Você pode editar o texto antes de enviar</span>
            </div>

            <textarea
              rows={8}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full bg-[#0d0d12] border border-[#28283a] focus:border-emerald-500 text-stone-100 rounded-2xl p-3.5 font-mono text-xs outline-none leading-relaxed transition"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#20202e] bg-[#14141e] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-stone-400">
            Destinatário: <strong className="text-stone-200">+{cleanPhone}</strong> ({order.clienteNome})
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#20202e] hover:bg-[#2c2c3e] text-stone-200 text-xs font-bold rounded-xl transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-950 text-xs font-extrabold rounded-xl transition shadow-lg shadow-emerald-950/50"
            >
              <Send className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
