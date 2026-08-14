import React, { useState } from 'react';
import { StoreConfig } from '../types';
import {
  Code2,
  Copy,
  Check,
  Globe,
  Key,
  Smartphone,
  ShieldCheck,
  ExternalLink,
  MessageSquareShare
} from 'lucide-react';

interface MetaIntegrationGuideProps {
  config: StoreConfig;
  onUpdateConfig: (updates: Partial<StoreConfig>) => Promise<void>;
  onRefresh: () => void;
}

export const MetaIntegrationGuide: React.FC<MetaIntegrationGuideProps> = ({
  config,
  onUpdateConfig,
  onRefresh
}) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookUrl = `${baseUrl}/api/whatsapp/webhook`;
  const verifyToken = config.webhookVerifyToken || 'assados_jeferson_webhook_secret';

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const [accessToken, setAccessToken] = useState(config.metaAccessToken || '');
  const [phoneId, setPhoneId] = useState(config.metaPhoneNumberId || '');
  const [customVerifyToken, setCustomVerifyToken] = useState(verifyToken);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateConfig({
        metaAccessToken: accessToken.trim() || undefined,
        metaPhoneNumberId: phoneId.trim() || undefined,
        webhookVerifyToken: customVerifyToken.trim() || undefined
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans-clean">
      <div className="bg-[#121218] border border-[#222230] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b border-[#20202e]">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <MessageSquareShare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-stone-100">
              Integração Oficial Meta WhatsApp Cloud API
            </h3>
            <p className="text-xs text-stone-400">
              Conecte o número de WhatsApp Business da sua empresa para receber e responder mensagens automaticamente
            </p>
          </div>
        </div>

        {/* Webhook Configuration Steps */}
        <div className="space-y-4">
          <h4 className="font-bold text-sm text-stone-200">1. Dados para o Painel de Desenvolvedores Meta:</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#181824] border border-[#262638] rounded-2xl p-4 space-y-2">
              <label className="text-xs font-semibold text-stone-300">Callback URL (Webhook):</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 bg-[#0d0d12] border border-[#2e2e42] text-stone-200 text-xs font-mono rounded-xl px-3 py-2 outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="p-2 bg-[#252538] hover:bg-[#303046] text-stone-200 rounded-xl transition"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="bg-[#181824] border border-[#262638] rounded-2xl p-4 space-y-2">
              <label className="text-xs font-semibold text-stone-300">Verify Token:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="flex-1 bg-[#0d0d12] border border-[#2e2e42] text-stone-200 text-xs font-mono rounded-xl px-3 py-2 outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(verifyToken);
                    setCopiedToken(true);
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="p-2 bg-[#252538] hover:bg-[#303046] text-stone-200 rounded-xl transition"
                >
                  {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-[#20202e]">
          <h4 className="font-bold text-sm text-stone-200">2. Credenciais Meta (opcional para envio de volta):</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300">Phone Number ID:</label>
              <input
                type="text"
                value={phoneId}
                onChange={e => setPhoneId(e.target.value)}
                placeholder="Ex: 104593829482910"
                className="w-full bg-[#0d0d12] border border-[#262638] focus:border-blue-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300">Permanent Access Token:</label>
              <input
                type="password"
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="EAAG..."
                className="w-full bg-[#0d0d12] border border-[#262638] focus:border-blue-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-blue-950/40"
            >
              {isSaving ? 'Salvando...' : 'Salvar Credenciais Meta'}
            </button>
            {savedToast && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Configurações salvas!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
