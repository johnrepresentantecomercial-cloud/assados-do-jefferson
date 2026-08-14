import React, { useState, useEffect, useRef } from 'react';
import { StoreConfig, Order } from '../types';
import { formatBRL } from '../utils/formatters';
import {
  Send,
  RotateCcw,
  Sparkles,
  User,
  Bot,
  Flame,
  FileText,
  Clock,
  Phone,
  Link2,
  CheckCheck
} from 'lucide-react';

interface WhatsAppSimulatorProps {
  config: StoreConfig;
  onOpenReceipt: (order: Order) => void;
  onOrderCreated: () => void;
  onNavigateToLinkGenerator: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  config,
  onOpenReceipt,
  onOrderCreated,
  onNavigateToLinkGenerator
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState<string>(() => `sim_${Date.now()}`);
  const [clientPhone, setClientPhone] = useState('(44) 99887-6655');
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial welcome message
  useEffect(() => {
    const welcome = config.mensagemBoasVindas || `Olá! Seja bem-vindo aos ${config.empresa} 🍖. Como posso ajudar no seu almoço de hoje?`;
    setMessages([
      {
        id: 'msg_welcome',
        sender: 'bot',
        text: welcome,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [config.mensagemBoasVindas, config.empresa]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          text,
          phone: clientPhone
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: data.reply?.text || 'Entendido!',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);

        if (data.orderCreated) {
          setLastCreatedOrder(data.orderCreated);
          onOrderCreated();
        }
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`/api/chat/reset/${sessionId}`, { method: 'POST' });
      setLastCreatedOrder(null);
      setMessages([
        {
          id: `rst_${Date.now()}`,
          sender: 'bot',
          text: config.mensagemBoasVindas || `Olá! Bem-vindo aos ${config.empresa} 🍖. O que deseja pedir hoje?`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (e) {}
  };

  const quickPrompts = [
    'Quais as carnes e acompanhamentos de hoje?',
    'Quero 1,5 kg de costela bovina e 1 maionese para retirar às 12:30',
    'Faz entrega no Jardim Alvorada? Qual a taxa?',
    'Qual a chave PIX para pagamento?'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start font-sans-clean">
      {/* Left / Top Info Box */}
      <div className="space-y-4">
        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#1f1f2c]">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-stone-100">Atendente IA Gemini</h3>
              <p className="text-xs text-stone-400">Simulador de WhatsApp Business</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-stone-300">
            <p>
              Este simulador interage diretamente com o motor de <strong>Inteligência Artificial (Gemini 2.5 Flash)</strong> conectado à base de dados de carnes, bairros e pedidos dos {config.empresa}.
            </p>
            <p>
              Ao fechar um pedido com a IA, ele é <strong>transmitido e sincronizado instantaneamente</strong> para a Cozinha e Gestão de Pedidos.
            </p>
          </div>

          {/* Quick Prompts */}
          <div className="space-y-2 pt-2 border-t border-[#1f1f2c]">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Sugestões de Mensagens:
            </span>
            <div className="flex flex-col gap-1.5">
              {quickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="text-left text-xs bg-[#191924] hover:bg-[#232332] text-stone-300 hover:text-stone-100 p-2.5 rounded-xl border border-[#262638] transition active:scale-98"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>

          {/* Customer links shortcut */}
          <div className="pt-2">
            <button
              onClick={onNavigateToLinkGenerator}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1a26] hover:bg-[#242436] text-amber-400 text-xs font-semibold rounded-xl border border-amber-500/30 transition"
            >
              <Link2 className="w-4 h-4" />
              <span>Gerar Links & QR Code para Clientes</span>
            </button>
          </div>
        </div>

        {/* Last order created alert */}
        {lastCreatedOrder && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between text-emerald-400 font-bold text-sm">
              <span className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                <span>Pedido Confirmado via IA!</span>
              </span>
              <span className="font-mono">{lastCreatedOrder.numeroPedido}</span>
            </div>
            <p className="text-xs text-stone-300">
              Cliente: <strong>{lastCreatedOrder.clienteNome}</strong> • Total: <strong>{formatBRL(lastCreatedOrder.total)}</strong>
            </p>
            <button
              onClick={() => onOpenReceipt(lastCreatedOrder)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs rounded-xl transition"
            >
              <FileText className="w-4 h-4" />
              <span>Ver Comprovante Balcão</span>
            </button>
          </div>
        )}
      </div>

      {/* Right / Chat Window */}
      <div className="lg:col-span-2 bg-[#0c0c12] border border-[#232332] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[640px]">
        {/* Chat Top Bar */}
        <div className="bg-[#14141e] border-b border-[#20202e] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
              <Flame className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-100">{config.empresa}</h4>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Atendente Virtual Online (IA Gemini)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              title="Reiniciar conversa"
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-[#20202e] rounded-xl transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0f]">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-1 ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-br-none shadow-md'
                    : 'bg-[#181824] border border-[#2a2a3c] text-stone-200 rounded-bl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div
                  className={`text-[10px] flex items-center justify-end gap-1 ${
                    msg.sender === 'user' ? 'text-emerald-200' : 'text-stone-500'
                  }`}
                >
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck className="w-3 h-3" />}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#181824] border border-[#2a2a3c] rounded-2xl p-3 text-xs text-stone-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>Atendente digitando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#14141e] border-t border-[#20202e]">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Digite sua mensagem para o atendimento..."
              className="flex-1 bg-[#0b0b10] border border-[#29293d] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-4 py-3 outline-none transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-stone-950 rounded-xl transition font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
