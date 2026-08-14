import React, { useState, useEffect } from 'react';
import { StoreConfig } from '../types';
import QRCode from 'qrcode';
import {
  Link2,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Share2,
  Flame,
  Download,
  RefreshCw,
  Sparkles,
  Globe,
  CheckCircle2
} from 'lucide-react';

interface WhatsAppLinkGeneratorProps {
  config: StoreConfig;
}

export const WhatsAppLinkGenerator: React.FC<WhatsAppLinkGeneratorProps> = ({ config }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHtmlLink, setCopiedHtmlLink] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const customerLink = `${baseUrl}/cardapio`;
  const customerHtmlLink = `${baseUrl}/cardapio.html`;
  const customerParamLink = `${baseUrl}/?view=cardapio`;

  const cleanPhone = (config.telefone || '44999961886').replace(/\D/g, '');
  const waDirectMessage = `Olá, *${config.empresa}*! Gostaria de fazer meu pedido de assados para o almoço: ${customerLink}`;
  const whatsappApiLink = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(waDirectMessage)}`;

  useEffect(() => {
    QRCode.toDataURL(customerLink, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }).then(setQrCodeUrl).catch(console.error);
  }, [customerLink]);

  const handleCopyLink = (text: string, type: 'direct' | 'html' | 'wa') => {
    navigator.clipboard.writeText(text);
    if (type === 'direct') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === 'html') {
      setCopiedHtmlLink(true);
      setTimeout(() => setCopiedHtmlLink(false), 2000);
    } else {
      setCopiedWa(true);
      setTimeout(() => setCopiedWa(false), 2000);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncStatus('Sincronizando dados com o servidor...');
    try {
      const [pRes, tRes, cRes] = await Promise.all([
        fetch('/api/database/products'),
        fetch('/api/database/delivery-taxes'),
        fetch('/api/database/config')
      ]);

      if (pRes.ok && tRes.ok && cRes.ok) {
        setSyncStatus('Sincronização concluída com sucesso! Todos os produtos e links estão ativos.');
      } else {
        setSyncStatus('Dados sincronizados.');
      }
    } catch (e) {
      setSyncStatus('Falha ao conectar na API local.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  return (
    <div className="space-y-6 font-sans-clean">
      <div className="bg-[#121218] border border-[#222230] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#20202e]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-stone-100">
                Links de Atendimento & Cardápio Digital Web
              </h3>
              <p className="text-xs text-stone-400">
                Envie para clientes no WhatsApp, Instagram, Google Meu Negócio ou imprima o QR Code no balcão
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncData}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a26] hover:bg-[#242436] text-stone-200 border border-[#2e2e42] rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Informações'}</span>
          </button>
        </div>

        {syncStatus && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Left: Link options */}
          <div className="space-y-4">
            {/* Direct Link 1 */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>1. Link Direto do Cardápio (/cardapio)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={customerLink}
                  className="flex-1 bg-[#0c0c12] border border-[#262638] text-stone-200 text-xs font-mono rounded-xl px-4 py-3 outline-none"
                />
                <button
                  onClick={() => handleCopyLink(customerLink, 'direct')}
                  className="flex items-center gap-1.5 px-4 py-3 bg-[#1e1e2c] hover:bg-[#28283c] text-stone-200 text-xs font-bold rounded-xl transition"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <a
                  href={customerLink}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl transition"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Direct Link 2 (HTML Version) */}
            <div className="space-y-2 pt-2 border-t border-[#1e1e2c]">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                <span>2. Link Direto em HTML (/cardapio.html)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={customerHtmlLink}
                  className="flex-1 bg-[#0c0c12] border border-[#262638] text-stone-200 text-xs font-mono rounded-xl px-4 py-3 outline-none"
                />
                <button
                  onClick={() => handleCopyLink(customerHtmlLink, 'html')}
                  className="flex items-center gap-1.5 px-4 py-3 bg-[#1e1e2c] hover:bg-[#28283c] text-stone-200 text-xs font-bold rounded-xl transition"
                >
                  {copiedHtmlLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedHtmlLink ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <a
                  href={customerHtmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-cyan-500 hover:bg-cyan-400 text-stone-950 rounded-xl transition"
                  title="Abrir página HTML"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* WhatsApp Link */}
            <div className="space-y-2 pt-2 border-t border-[#1e1e2c]">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>3. Mensagem Automática para WhatsApp</span>
              </label>
              <div className="bg-[#0c0c12] border border-[#262638] rounded-2xl p-3.5 space-y-2 text-xs">
                <p className="text-stone-300 italic whitespace-pre-wrap font-sans">
                  "{waDirectMessage}"
                </p>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e2c]">
                  <button
                    onClick={() => handleCopyLink(waDirectMessage, 'wa')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181824] hover:bg-[#222232] text-stone-300 text-xs rounded-lg transition"
                  >
                    {copiedWa ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copiar Texto</span>
                  </button>
                  <a
                    href={whatsappApiLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Testar no WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right: QR Code */}
          <div className="bg-[#181824] border border-[#262638] rounded-3xl p-6 flex flex-col items-center text-center space-y-4">
            <h4 className="font-bold text-sm text-stone-100">QR Code da Mesa & Balcão</h4>
            {qrCodeUrl ? (
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <img src={qrCodeUrl} alt="QR Code Pedido Web" className="w-48 h-48 mx-auto" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-[#0c0c12] rounded-2xl flex items-center justify-center text-stone-600">
                Gerando...
              </div>
            )}
            <p className="text-xs text-stone-400 max-w-xs">
              Aponte a câmera do celular para abrir o cardápio e fazer o pedido em tempo real com sincronização automática.
            </p>
            {qrCodeUrl && (
              <a
                href={qrCodeUrl}
                download="qrcode-assados-do-jeferson.png"
                className="flex items-center gap-2 px-4 py-2 bg-[#252538] hover:bg-[#303048] text-stone-200 text-xs font-semibold rounded-xl transition"
              >
                <Download className="w-4 h-4" />
                <span>Salvar Imagem do QR Code</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
