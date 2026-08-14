import React, { useState, useEffect } from 'react';
import { Product, DeliveryTax, Order, StoreConfig, FormaPagamento, TipoRecebimento, OrderItemMeat, OrderItemUnit } from '../types';
import { formatBRL, AVAILABLE_TIME_SLOTS } from '../utils/formatters';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import {
  Flame,
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Send,
  Sparkles,
  QrCode,
  Copy,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Banknote,
  DollarSign,
  UtensilsCrossed,
  ArrowLeft,
  Truck,
  Building2,
  HelpCircle,
  Share2,
  RefreshCw,
  BookOpen,
  Check,
  Scale
} from 'lucide-react';

interface CustomerWebOrderProps {
  config: StoreConfig;
  products: Product[];
  deliveryTaxes: DeliveryTax[];
  onOrderCreated?: (order: Order) => void;
  onExitToAdmin?: () => void;
  isAdminViewing?: boolean;
}

export const CustomerWebOrder: React.FC<CustomerWebOrderProps> = ({
  config: initialConfig,
  products: initialProducts,
  deliveryTaxes: initialTaxes,
  onOrderCreated,
  onExitToAdmin,
  isAdminViewing = false
}) => {
  // Local state initialized with props and synced with API
  const [config, setConfig] = useState<StoreConfig>(initialConfig);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [deliveryTaxes, setDeliveryTaxes] = useState<DeliveryTax[]>(initialTaxes);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Navigation tabs inside customer view
  const [activeCustomerTab, setActiveCustomerTab] = useState<'FORMULARIO' | 'CHAT_IA' | 'CARDAPIO'>('FORMULARIO');
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<'TODOS' | 'Carne' | 'Acompanhamento' | 'Bebida'>('TODOS');
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncFeedbackToast, setSyncFeedbackToast] = useState(false);

  // Customer Contact Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Delivery / Pickup Settings
  const [tipoRecebimento, setTipoRecebimento] = useState<TipoRecebimento>('Entrega');
  const [selectedBairro, setSelectedBairro] = useState<string>('');
  const [enderecoRua, setEnderecoRua] = useState('');
  const [enderecoNumero, setEnderecoNumero] = useState('');
  const [enderecoComplemento, setEnderecoComplemento] = useState('');
  const [enderecoReferencia, setEnderecoReferencia] = useState('');
  const [horarioEntrega, setHorarioEntrega] = useState('11:30');
  const [horarioRetirada, setHorarioRetirada] = useState('11:30');
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Payment Method - Defaults to Card/Cash (PIX removed per flow)
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('Cartão');
  const [trocoPara, setTrocoPara] = useState<string>('');

  // Cart / Items Selection
  const [selectedMeats, setSelectedMeats] = useState<OrderItemMeat[]>([]);
  const [selectedSides, setSelectedSides] = useState<OrderItemUnit[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<OrderItemUnit[]>([]);

  // Keep internal state updated when props change
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    if (initialTaxes && initialTaxes.length > 0) setDeliveryTaxes(initialTaxes);
  }, [initialTaxes]);

  useEffect(() => {
    if (initialConfig && initialConfig.empresa) setConfig(initialConfig);
  }, [initialConfig]);

  // Synchronize with API
  const refreshLiveMenuData = async (silent = true) => {
    if (!silent) setIsManualSyncing(true);
    try {
      const [prodsRes, taxesRes, configRes] = await Promise.all([
        fetch('/api/database/products'),
        fetch('/api/database/delivery-taxes'),
        fetch('/api/database/config')
      ]);

      if (prodsRes.ok) {
        const p = await prodsRes.json();
        setProducts(p);
      }
      if (taxesRes.ok) {
        const t = await taxesRes.json();
        setDeliveryTaxes(t);
      }
      if (configRes.ok) {
        const c = await configRes.json();
        setConfig(c);
      }

      if (!silent) {
        setSyncFeedbackToast(true);
        setTimeout(() => setSyncFeedbackToast(false), 2500);
      }
    } catch (err) {
      console.error('Error refreshing menu data:', err);
    } finally {
      if (!silent) setIsManualSyncing(false);
    }
  };

  // Setup Real-time SSE and Initial Load
  useEffect(() => {
    // Initial fetch
    refreshLiveMenuData(true).then(() => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        parseUrlParams(products, deliveryTaxes);
      }
    });

    // Real-time EventSource listener
    let sse: EventSource | null = null;
    try {
      sse = new EventSource('/api/events');
      sse.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (['PRODUCTS_CHANGED', 'TAXES_CHANGED', 'CONFIG_CHANGED'].includes(data.type)) {
            refreshLiveMenuData(true);
          }
        } catch (err) {}
      };
    } catch (err) {
      console.warn('SSE not supported or failed to connect:', err);
    }

    // Polling interval backup (every 4s)
    const interval = setInterval(() => {
      refreshLiveMenuData(true);
    }, 4000);

    return () => {
      if (sse) sse.close();
      clearInterval(interval);
    };
  }, []);

  // Helper to parse URL params and pre-populate cart
  const parseUrlParams = (currentProds: Product[], currentTaxes: DeliveryTax[]) => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);

      // Check tab param
      const tabParam = params.get('tab');
      if (tabParam === 'chat' || tabParam === 'ia') {
        setActiveCustomerTab('CHAT_IA');
      } else if (tabParam === 'cardapio') {
        setActiveCustomerTab('CARDAPIO');
      }

      // Check customer info
      const clienteParam = params.get('cliente') || params.get('nome');
      if (clienteParam && clienteParam !== '1') {
        setCustomerName(clienteParam);
      }

      const telParam = params.get('tel') || params.get('telefone') || params.get('phone');
      if (telParam) {
        setCustomerPhone(telParam);
      }

      const tipoParam = params.get('tipo') || params.get('entrega');
      if (tipoParam) {
        if (tipoParam.toLowerCase().includes('retirada') || tipoParam.toLowerCase().includes('balcao')) {
          setTipoRecebimento('Retirada');
        } else {
          setTipoRecebimento('Entrega');
        }
      }

      const bairroParam = params.get('bairro');
      if (bairroParam) {
        const foundBairro = currentTaxes.find(t => t.bairro.toLowerCase() === bairroParam.toLowerCase());
        if (foundBairro) {
          setSelectedBairro(foundBairro.bairro);
        } else {
          setSelectedBairro(bairroParam);
        }
      }

      // Pre-fill Meat item
      const carneParam = params.get('carne');
      const pesoParam = params.get('peso') || '1,5 kg';

      if (carneParam && currentProds.length > 0) {
        const matchedMeat = currentProds.find(
          p => p.categoria === 'Carne' && p.nome.toLowerCase().includes(carneParam.toLowerCase())
        );

        if (matchedMeat) {
          let pesoKg = 1.5;
          const cleanPeso = pesoParam.replace(',', '.').replace(/[^\d.]/g, '');
          if (cleanPeso) {
            pesoKg = parseFloat(cleanPeso) || 1.5;
          }

          setSelectedMeats([
            {
              produto: matchedMeat.nome,
              peso: pesoParam,
              pesoKg: pesoKg,
              precoKg: matchedMeat.preco,
              subtotal: matchedMeat.preco * pesoKg
            }
          ]);
        }
      }

      // Pre-fill Side item
      const acompParam = params.get('acomp');
      if (acompParam && acompParam !== 'Nenhum' && currentProds.length > 0) {
        const matchedSide = currentProds.find(
          p => p.categoria === 'Acompanhamento' && p.nome.toLowerCase().includes(acompParam.toLowerCase())
        );
        if (matchedSide) {
          setSelectedSides([
            {
              produto: matchedSide.nome,
              quantidade: 1,
              precoUnitario: matchedSide.preco,
              subtotal: matchedSide.preco
            }
          ]);
        }
      }

      // Pre-fill Drink item
      const bebidaParam = params.get('bebida');
      if (bebidaParam && bebidaParam !== 'Nenhuma' && currentProds.length > 0) {
        const matchedDrink = currentProds.find(
          p => p.categoria === 'Bebida' && p.nome.toLowerCase().includes(bebidaParam.toLowerCase())
        );
        if (matchedDrink) {
          setSelectedDrinks([
            {
              produto: matchedDrink.nome,
              quantidade: 1,
              precoUnitario: matchedDrink.preco,
              subtotal: matchedDrink.preco
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Error parsing order link URL params:', err);
    }
  };

  // AI Chat States
  const [chatSessionId] = useState(() => `web_customer_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      id: 'welcome_1',
      sender: 'bot',
      text: `Olá! Bem-vindo(a) ao *${config.empresa}*! 🍖🔥\n\nSou seu atendente virtual inteligente. Como posso ajudar você hoje?\n\n• Posso tirar dúvidas sobre os assados de hoje;\n• Calcular sua taxa de entrega;\n• Ou você pode montar seu pedido diretamente pelo formulário rápido acima!`,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Success / Receipt State
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string>('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Filter Active Products
  const meats = products.filter(p => p.categoria === 'Carne' && p.ativo !== false);
  const sides = products.filter(p => p.categoria === 'Acompanhamento' && p.ativo !== false);
  const drinks = products.filter(p => p.categoria === 'Bebida' && p.ativo !== false);

  // Active delivery tax calculation
  const currentTaxObj = deliveryTaxes.find(t => t.bairro.toLowerCase() === selectedBairro.toLowerCase() && t.ativo !== false);
  const taxaEntrega = tipoRecebimento === 'Retirada' ? 0 : (currentTaxObj ? currentTaxObj.taxa : (selectedBairro ? config.taxaPadrao : 0));

  // Subtotal Calculation
  const subtotalCarnes = selectedMeats.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotalAcomp = selectedSides.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotalBebidas = selectedDrinks.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotal = subtotalCarnes + subtotalAcomp + subtotalBebidas;
  const total = subtotal + taxaEntrega;

  // Generate PIX QR Code for completed order
  useEffect(() => {
    if (completedOrder && completedOrder.formaPagamento === 'PIX') {
      const pixString = `00020126580014BR.GOV.BCB.PIX0136${config.chavePix}5204000053039865405${completedOrder.total.toFixed(2)}5802BR5919${config.empresa.slice(0, 25)}6009CURITIBA62070503***6304`;
      QRCode.toDataURL(pixString, {
        width: 300,
        margin: 2,
        color: { dark: '#0b0b0e', light: '#ffffff' }
      }).then(url => setPixQrDataUrl(url)).catch(() => {});
    }
  }, [completedOrder, config.chavePix, config.empresa]);

  // Helper to check if a product is sold by weight (kg) or by unit (un)
  const isSoldByKg = (unidade?: string): boolean => {
    if (!unidade) return true;
    const u = unidade.toLowerCase().trim();
    return u === 'kg' || u.includes('kg') || u.includes('quilo');
  };

  const formatDisplayUnit = (unidade?: string): string => {
    if (isSoldByKg(unidade)) return 'kg';
    if (!unidade || unidade === 'unidade' || unidade === 'un') return 'un';
    return unidade;
  };

  // Helper for adding / changing meat by weight (kg) in cart
  const handleAddOrUpdateMeat = (prod: Product, pesoStr: string, pesoKg: number) => {
    setSelectedMeats(prev => {
      const existsIdx = prev.findIndex(m => m.produto === prod.nome);
      const sub = prod.preco * pesoKg;
      const newItem: OrderItemMeat = {
        produto: prod.nome,
        peso: pesoStr,
        pesoKg: pesoKg,
        precoKg: prod.preco,
        subtotal: sub
      };

      if (existsIdx >= 0) {
        const copy = [...prev];
        copy[existsIdx] = newItem;
        return copy;
      }
      return [...prev, newItem];
    });
  };

  // Helper for adding / updating meat sold by unit (un) in cart (e.g. Frango Assado)
  const handleUpdateMeatUnit = (prod: Product, delta: number) => {
    setSelectedMeats(prev => {
      const idx = prev.findIndex(m => m.produto === prod.nome);
      if (idx >= 0) {
        const currentQty = prev[idx].pesoKg || 1;
        const newQty = currentQty + delta;
        if (newQty <= 0) {
          return prev.filter((_, i) => i !== idx);
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          peso: `${newQty} un`,
          pesoKg: newQty,
          subtotal: newQty * prod.preco
        };
        return updated;
      } else if (delta > 0) {
        return [
          ...prev,
          {
            produto: prod.nome,
            peso: `${delta} un`,
            pesoKg: delta,
            precoKg: prod.preco,
            subtotal: delta * prod.preco
          }
        ];
      }
      return prev;
    });
  };

  const handleRemoveMeat = (prodName: string) => {
    setSelectedMeats(prev => prev.filter(m => m.produto !== prodName));
  };

  // Helper for sides & drinks (+ / -)
  const handleUpdateUnitItem = (
    category: 'Acompanhamento' | 'Bebida',
    prod: Product,
    delta: number,
    sabor?: string
  ) => {
    const list = category === 'Acompanhamento' ? selectedSides : selectedDrinks;
    const setList = category === 'Acompanhamento' ? setSelectedSides : setSelectedDrinks;

    setList(prev => {
      const idx = prev.findIndex(item => item.produto === prod.nome && item.sabor === sabor);
      if (idx >= 0) {
        const currentQty = prev[idx].quantidade;
        const newQty = currentQty + delta;
        if (newQty <= 0) {
          return prev.filter((_, i) => i !== idx);
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantidade: newQty,
          subtotal: newQty * prod.preco
        };
        return updated;
      } else if (delta > 0) {
        return [
          ...prev,
          {
            produto: prod.nome,
            sabor: sabor || undefined,
            quantidade: delta,
            precoUnitario: prod.preco,
            subtotal: delta * prod.preco
          }
        ];
      }
      return prev;
    });
  };

  // Chat message submission
  const handleSendChatMessage = async (customTxt?: string) => {
    const textToSend = customTxt || chatInput.trim();
    if (!textToSend || chatLoading) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customTxt) setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: chatSessionId,
          text: textToSend,
          phone: customerPhone || 'WebBrowser'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg = {
          id: `bot_${Date.now()}`,
          sender: 'bot' as const,
          text: data.reply?.text || 'Entendido!',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, botMsg]);

        // If order was generated via chat
        if (data.orderCreated) {
          setCompletedOrder(data.orderCreated);
          if (onOrderCreated) onOrderCreated(data.orderCreated);
          
          // Broadcast to admin dashboard tabs immediately
          try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
              const bc = new BroadcastChannel('assados_orders_channel');
              bc.postMessage({ type: 'NEW_ORDER', order: data.orderCreated });
              bc.close();
            }
            localStorage.setItem('assados_last_order_ts', Date.now().toString());
          } catch (e) {}

          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
      } else {
        throw new Error('Falha ao comunicar com o servidor');
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'bot',
          text: 'Desculpe, ocorreu uma instabilidade momentânea na conexão. Por favor, utilize o formulário de pedido ou tente novamente.',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Submit Order from Form
  const handleSubmitFormOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validations
    if (!customerName.trim()) {
      setSubmitError('Por favor, informe seu nome completo para identificação do pedido.');
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 8) {
      setSubmitError('Por favor, informe seu número de WhatsApp / Telefone para contato.');
      return;
    }

    if (selectedMeats.length === 0 && selectedSides.length === 0 && selectedDrinks.length === 0) {
      setSubmitError('Seu carrinho está vazio. Por favor, adicione pelo menos uma carne ou item ao seu pedido.');
      return;
    }

    if (tipoRecebimento === 'Entrega') {
      if (!selectedBairro) {
        setSubmitError('Por favor, selecione o bairro para cálculo da taxa de entrega.');
        return;
      }
      if (!enderecoRua.trim() || !enderecoNumero.trim()) {
        setSubmitError('Por favor, preencha o nome da rua e o número da residência para a entrega.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const orderPayload: Omit<Order, 'id' | 'numeroPedido' | 'dataHora' | 'status'> = {
        clienteNome: customerName.trim(),
        clienteTelefone: customerPhone.trim(),
        tipoRecebimento,
        enderecoRua: tipoRecebimento === 'Entrega' ? enderecoRua.trim() : undefined,
        enderecoNumero: tipoRecebimento === 'Entrega' ? enderecoNumero.trim() : undefined,
        enderecoBairro: tipoRecebimento === 'Entrega' ? selectedBairro : undefined,
        enderecoComplemento: enderecoComplemento.trim() || undefined,
        enderecoReferencia: enderecoReferencia.trim() || undefined,
        horario: tipoRecebimento === 'Entrega' ? horarioEntrega : horarioRetirada,
        carnes: selectedMeats,
        acompanhamentos: selectedSides,
        bebidas: selectedDrinks,
        subtotal,
        taxaEntrega,
        total,
        formaPagamento,
        trocoPara: (formaPagamento === 'Dinheiro' && trocoPara) ? parseFloat(trocoPara.replace(',', '.')) : undefined,
        observacoes: observacoesGerais.trim() || undefined,
        criadoEm: Date.now(),
        origem: 'Web'
      };

      const res = await fetch('/api/database/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (!res.ok) {
        throw new Error('Não foi possível registrar o pedido. Tente novamente.');
      }

      const createdOrder: Order = await res.json();
      setCompletedOrder(createdOrder);
      if (onOrderCreated) onOrderCreated(createdOrder);

      // Broadcast to admin dashboard tabs immediately
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('assados_orders_channel');
          bc.postMessage({ type: 'NEW_ORDER', order: createdOrder });
          bc.close();
        }
        localStorage.setItem('assados_last_order_ts', Date.now().toString());
      } catch (e) {}

      // Trigger Celebration Confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 }
      });
    } catch (err: any) {
      console.error('Error creating order:', err);
      setSubmitError(err.message || 'Erro ao enviar pedido. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(config.chavePix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  // WhatsApp formatted confirmation link for customer to message the store
  const getCustomerWhatsAppMessage = () => {
    if (!completedOrder) return '';
    const cleanPhone = (config.telefone || '44999961886').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Olá! Fiz o pedido *#${completedOrder.numeroPedido}* pelo cardápio online no *${config.empresa}*!\n\n` +
      `👤 *Cliente:* ${completedOrder.clienteNome}\n` +
      `📦 *Tipo:* ${completedOrder.tipoRecebimento}\n` +
      `💳 *Forma de Pagamento:* ${completedOrder.formaPagamento}\n` +
      `💵 *Total Estimado Inicial:* ${formatBRL(completedOrder.total)}\n\n` +
      `*Aviso:* Pedido Realizado! Após a pesagem dos itens o valor será atualizado para o pagamento.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div className="min-h-screen bg-[#070709] text-stone-200 font-sans-clean selection:bg-amber-600 selection:text-white flex flex-col items-center">
      {/* Top Banner if Admin is previewing customer view */}
      {isAdminViewing && (
        <div className="w-full bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 border-b border-amber-500/30 px-4 py-2 text-xs flex items-center justify-between text-amber-200">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <strong>Modo de Pré-visualização do Cliente Web:</strong> Esta é exatamente a tela que o seu cliente vê ao acessar pelo navegador do Google / celular.
          </div>
          {onExitToAdmin && (
            <button
              onClick={onExitToAdmin}
              className="flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg text-xs font-semibold border border-stone-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Painel Admin</span>
            </button>
          )}
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-4xl px-4 py-6 sm:py-8 space-y-6">
        {/* Brand Header Card */}
        <header className="bg-[#0e0e13] border border-[#242430] rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-stone-900 p-0.5 shadow-xl flex items-center justify-center shrink-0 border border-amber-400/40">
                <div className="w-full h-full bg-[#121218] rounded-[14px] flex items-center justify-center text-amber-400">
                  <Flame className="w-9 h-9 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-stone-100 tracking-wide">
                    {config.empresa}
                  </h1>
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Aberto
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-amber-200/80 font-serif-display italic">
                  Tradição em carnes assadas nobres na brasa, costela e guarnições
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{config.horarioInicio} às {config.horarioFim}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{config.telefone}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Entrega & Retirada</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Share / WhatsApp Contact button & Sincronizar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => refreshLiveMenuData(false)}
                disabled={isManualSyncing}
                title="Sincronizar cardápio e preços ao vivo com a loja"
                className="flex items-center gap-1.5 px-3 py-2 bg-[#181824] hover:bg-[#222232] border border-[#2a2a3c] text-stone-200 text-xs font-semibold rounded-xl transition active:scale-95 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isManualSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isManualSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>

              <a
                href={`https://wa.me/${(config.telefone || '44999961886').replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Gostaria de tirar uma dúvida sobre o cardápio.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-xl transition active:scale-95 shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Sync Toast */}
          {syncFeedbackToast && (
            <div className="mt-3 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center justify-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Cardápio e preços sincronizados em tempo real!</span>
            </div>
          )}

          {/* Navigation Tabs (Formulário Rápido vs Cardápio Completo vs Chat com IA) */}
          {!completedOrder && (
            <div className="mt-6 pt-5 border-t border-[#1f1f2a] flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={() => setActiveCustomerTab('FORMULARIO')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeCustomerTab === 'FORMULARIO'
                    ? 'bg-amber-600 text-stone-950 shadow-lg shadow-amber-950/50 scale-102'
                    : 'bg-[#14141c] text-stone-300 hover:bg-[#1a1a24] border border-[#242432]'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>📋 Fazer Pedido Online</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCustomerTab('CARDAPIO')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeCustomerTab === 'CARDAPIO'
                    ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-950/50 scale-102'
                    : 'bg-[#14141c] text-stone-300 hover:bg-[#1a1a24] border border-[#242432]'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>📖 Cardápio Digital</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCustomerTab('CHAT_IA')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeCustomerTab === 'CHAT_IA'
                    ? 'bg-emerald-600 text-stone-950 shadow-lg shadow-emerald-950/50 scale-102'
                    : 'bg-[#14141c] text-stone-300 hover:bg-[#1a1a24] border border-[#242432]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>💬 Atendente Virtual IA</span>
              </button>
            </div>
          )}
        </header>

        {/* --- SCENARIO 1: ORDER COMPLETED SUCCESS RECEIPT --- */}
        {completedOrder && (
          <div className="bg-[#0e0e13] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-stone-100 animate-in fade-in zoom-in-95 duration-300">
            {/* Header Success with requested message */}
            <div className="text-center space-y-3 pb-6 border-b border-[#242432]">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/50">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              
              {/* Requested prominent message */}
              <div className="p-4 bg-gradient-to-r from-amber-950/80 via-emerald-950/80 to-amber-950/80 border-2 border-amber-500/60 rounded-2xl shadow-xl max-w-xl mx-auto space-y-1.5">
                <h2 className="text-lg sm:text-xl font-display font-extrabold text-amber-300 tracking-tight leading-snug">
                  Pedido Realizado! Após a pesagem dos itens o valor será atualizado para o pagamento!
                </h2>
                <p className="text-xs text-stone-300">
                  Nossas carnes assadas são pesadas na balança na montagem da embalagem.
                </p>
              </div>

              <p className="text-xs sm:text-sm text-stone-400 font-sans-clean max-w-lg mx-auto">
                Seu pedido foi registrado em nossa cozinha com sucesso e já está sendo preparado com todo o carinho e sabor do fogo a lenha.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-950/60 border border-amber-500/40 rounded-full text-amber-300 text-xs font-bold mt-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Pedido #{completedOrder.numeroPedido}</span>
              </div>
            </div>

            {/* Receipt Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Order Items & Delivery Info */}
              <div className="bg-[#121218] border border-[#22222e] rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="font-display font-bold text-base text-stone-100 flex items-center gap-2 border-b border-[#1f1f28] pb-2">
                  <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                  <span>Resumo dos Itens</span>
                </h3>

                <div className="space-y-2.5">
                  {completedOrder.carnes.map((c, i) => (
                    <div key={i} className="flex justify-between items-start border-b border-[#1a1a24] pb-2">
                      <div>
                        <span className="font-semibold text-stone-200">🥩 {c.produto}</span>
                        <p className="text-[11px] text-stone-400">
                          {c.peso?.includes('un') ? `Qtd: ${c.peso}` : `Peso Estimado: ${c.peso}`} ({formatBRL(c.precoKg)}/{c.peso?.includes('un') ? 'un' : 'kg'})
                        </p>
                      </div>
                      <span className="font-mono-clean font-bold text-amber-400">{formatBRL(c.subtotal)}</span>
                    </div>
                  ))}

                  {completedOrder.acompanhamentos.map((a, i) => (
                    <div key={i} className="flex justify-between items-start border-b border-[#1a1a24] pb-2">
                      <div>
                        <span className="font-semibold text-stone-200">🥗 {a.quantidade}x {a.produto}</span>
                      </div>
                      <span className="font-mono-clean font-bold text-stone-300">{formatBRL(a.subtotal)}</span>
                    </div>
                  ))}

                  {completedOrder.bebidas.map((b, i) => (
                    <div key={i} className="flex justify-between items-start border-b border-[#1a1a24] pb-2">
                      <div>
                        <span className="font-semibold text-stone-200">🥤 {b.quantidade}x {b.produto}</span>
                        {b.sabor && <span className="text-[10px] text-stone-400"> ({b.sabor})</span>}
                      </div>
                      <span className="font-mono-clean font-bold text-stone-300">{formatBRL(b.subtotal)}</span>
                    </div>
                  ))}
                </div>

                {/* Subtotals */}
                <div className="pt-2 space-y-1.5 border-t border-[#22222e]">
                  <div className="flex justify-between text-stone-400">
                    <span>Subtotal estimado dos itens:</span>
                    <span className="font-mono-clean">{formatBRL(completedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Taxa de Entrega ({completedOrder.tipoRecebimento}):</span>
                    <span className="font-mono-clean">{formatBRL(completedOrder.taxaEntrega)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-amber-400 pt-1 border-t border-[#1f1f28]">
                    <span>Total Estimado Inicial:</span>
                    <span className="font-mono-clean text-base">{formatBRL(completedOrder.total)}</span>
                  </div>
                </div>

                {/* Details of Delivery */}
                <div className="p-3 bg-[#09090d] rounded-xl border border-[#1e1e28] space-y-1 text-[11px] text-stone-300">
                  <p><strong>Cliente:</strong> {completedOrder.clienteNome} ({completedOrder.clienteTelefone})</p>
                  {completedOrder.tipoRecebimento === 'Entrega' ? (
                    <p><strong>Endereço:</strong> {completedOrder.enderecoRua}, {completedOrder.enderecoNumero} - {completedOrder.enderecoBairro} {completedOrder.enderecoComplemento ? `(${completedOrder.enderecoComplemento})` : ''}</p>
                  ) : (
                    <p><strong>Retirada no Balcão:</strong> Horário estimado {completedOrder.horario}</p>
                  )}
                  <p><strong>Forma de Pagamento:</strong> {completedOrder.formaPagamento} {completedOrder.trocoPara ? `(Troco para ${formatBRL(completedOrder.trocoPara)})` : ''}</p>
                </div>
              </div>

              {/* Right Column: Weighing Status & Payment Instructions */}
              <div className="bg-[#121218] border border-[#22222e] rounded-2xl p-5 space-y-5 flex flex-col justify-between text-xs">
                <div className="space-y-4">
                  <h3 className="font-display font-bold text-base text-stone-100 flex items-center gap-2 border-b border-[#1f1f28] pb-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    <span>Pesagem e Pagamento ({completedOrder.formaPagamento})</span>
                  </h3>

                  {/* Weighing Explanatory Card */}
                  <div className="p-4 bg-gradient-to-b from-[#181826] to-[#12121c] border border-amber-500/30 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2.5 text-amber-400 font-bold text-xs">
                      <Scale className="w-5 h-5 shrink-0" />
                      <span>Processo de Pesagem na Balança</span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      Assim que as carnes saírem do fogo, nossa equipe pesará as peças na balança de precisão para calcular o peso exato e atualizar o valor do pedido.
                    </p>
                    <div className="p-2.5 bg-[#0a0a0f] rounded-xl border border-[#232336] text-[11px] text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Você só paga pelo peso exato que for preparado!</span>
                    </div>
                  </div>

                  {completedOrder.formaPagamento === 'Cartão' && (
                    <div className="p-4 bg-[#161622] rounded-xl border border-[#262638] space-y-2 text-center">
                      <CreditCard className="w-7 h-7 text-emerald-400 mx-auto" />
                      <p className="text-xs font-semibold text-stone-200">Máquina de Cartão</p>
                      <p className="text-[11px] text-stone-400">
                        {completedOrder.tipoRecebimento === 'Entrega'
                          ? 'O entregador levará a maquininha para pagamento (Débito ou Crédito) no momento da entrega.'
                          : 'O pagamento será feito no balcão com maquininha (Débito ou Crédito) na retirada.'}
                      </p>
                    </div>
                  )}

                  {completedOrder.formaPagamento === 'Dinheiro' && (
                    <div className="p-4 bg-[#161622] rounded-xl border border-[#262638] space-y-2 text-center">
                      <Banknote className="w-7 h-7 text-emerald-400 mx-auto" />
                      <p className="text-xs font-semibold text-stone-200">Pagamento em Dinheiro</p>
                      <p className="text-[11px] text-stone-400">
                        {completedOrder.trocoPara
                          ? `Levar troco para ${formatBRL(completedOrder.trocoPara)}.`
                          : 'Pagamento em dinheiro na entrega/retirada após a pesagem final.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* WhatsApp Notification & Reset Buttons */}
                <div className="space-y-2.5 pt-4 border-t border-[#1f1f28]">
                  <a
                    href={getCustomerWhatsAppMessage()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-extrabold rounded-xl transition shadow-lg shadow-emerald-950/40 text-xs"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Avisar a Loja no WhatsApp do Pedido</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setCompletedOrder(null);
                      setSelectedMeats([]);
                      setSelectedSides([]);
                      setSelectedDrinks([]);
                    }}
                    className="w-full py-2.5 px-4 bg-[#181822] hover:bg-[#20202e] border border-[#282838] text-stone-300 font-semibold rounded-xl transition text-xs"
                  >
                    Fazer Novo Pedido
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SCENARIO 2: LIVE CHATBOT IA ASSISTANT TAB --- */}
        {!completedOrder && activeCustomerTab === 'CHAT_IA' && (
          <div className="bg-[#0e0e13] border border-[#242430] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1f1f2a] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-stone-100">
                    Atendente Virtual do Assados do Jeferson
                  </h3>
                  <p className="text-[11px] text-stone-400">Converse naturalmente para tirar dúvidas ou fazer seu pedido</p>
                </div>
              </div>

              <span className="text-[11px] text-emerald-400 font-mono-clean flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </span>
            </div>

            {/* Chat Messages Box */}
            <div className="h-96 overflow-y-auto space-y-3 p-3 bg-[#08080b] rounded-2xl border border-[#1e1e28]">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-sans-clean leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-amber-600 text-stone-950 font-medium rounded-tr-none'
                        : 'bg-[#14141c] text-stone-100 border border-[#242434] rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        msg.sender === 'user' ? 'text-amber-950/70' : 'text-stone-400'
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#14141c] border border-[#242434] rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-stone-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span>Digitando resposta...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleSendChatMessage('Qual o cardápio e preços dos assados de hoje?')}
                className="px-2.5 py-1 bg-[#14141c] hover:bg-[#1c1c28] border border-[#242434] rounded-lg text-stone-300 transition"
              >
                🍖 Ver Cardápio de Hoje
              </button>
              <button
                type="button"
                onClick={() => handleSendChatMessage('Quanto fica a taxa de entrega para o Centro?')}
                className="px-2.5 py-1 bg-[#14141c] hover:bg-[#1c1c28] border border-[#242434] rounded-lg text-stone-300 transition"
              >
                🚚 Consultar Taxa de Bairro
              </button>
              <button
                type="button"
                onClick={() => handleSendChatMessage('Gostaria de pedir 1,5 kg de costela ripa e maionese')}
                className="px-2.5 py-1 bg-[#14141c] hover:bg-[#1c1c28] border border-[#242434] rounded-lg text-stone-300 transition"
              >
                🥩 Pedir 1,5 kg de Costela
              </button>
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Digite sua mensagem para o atendente..."
                className="flex-1 bg-[#121218] border border-[#242432] rounded-xl px-4 py-3 text-xs text-stone-100 focus:outline-none focus:border-amber-500 transition"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="p-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 rounded-xl font-bold transition shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* --- SCENARIO 2.5: DIGITAL MENU OVERVIEW (CARDÁPIO DIGITAL) --- */}
        {!completedOrder && activeCustomerTab === 'CARDAPIO' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
              {(['TODOS', 'Carne', 'Acompanhamento', 'Bebida'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedMenuCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    selectedMenuCategory === cat
                      ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/40'
                      : 'bg-[#121218] text-stone-300 hover:bg-[#1a1a24] border border-[#242432]'
                  }`}
                >
                  {cat === 'TODOS' ? '🔥 Todos os Itens' : cat === 'Carne' ? '🥩 Carnes Assadas' : cat === 'Acompanhamento' ? '🥗 Guarnições & Acompanhamentos' : '🥤 Bebidas & Refrigerantes'}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products
                .filter(p => selectedMenuCategory === 'TODOS' || p.categoria === selectedMenuCategory)
                .map(product => {
                  const isAvailable = product.ativo !== false;
                  return (
                    <div
                      key={product.id}
                      className={`rounded-3xl p-5 border flex flex-col justify-between space-y-4 transition ${
                        isAvailable
                          ? 'bg-[#0f0f16] border-[#222232] hover:border-amber-500/50 shadow-xl'
                          : 'bg-[#0d0d12]/70 border-[#201d24] opacity-75'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#1c1c2b] text-amber-400 border border-[#2c2c40]">
                            {product.categoria}
                          </span>
                          {isAvailable ? (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Disponível Hoje
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              Esgotado / Indisponível
                            </span>
                          )}
                        </div>

                        <h3 className={`font-bold text-base ${isAvailable ? 'text-stone-100' : 'text-stone-400 line-through'}`}>
                          {product.nome}
                        </h3>

                        {product.descricao && (
                          <p className="text-xs text-stone-400 line-clamp-3 leading-relaxed">
                            {product.descricao}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#1c1c28] flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-stone-400 block">Preço</span>
                          <span className={`font-mono-clean font-extrabold text-base ${isAvailable ? 'text-emerald-400' : 'text-stone-500'}`}>
                            {formatBRL(product.preco)}
                            <span className="text-xs text-stone-400 font-normal"> /{formatDisplayUnit(product.unidade)}</span>
                          </span>
                        </div>

                        {isAvailable ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCustomerTab('FORMULARIO');
                              if (product.categoria === 'Carne') {
                                if (isSoldByKg(product.unidade)) {
                                  handleAddOrUpdateMeat(product, '1,0 kg', 1.0);
                                } else {
                                  handleUpdateMeatUnit(product, 1);
                                }
                              } else {
                                handleUpdateUnitItem(product.categoria as any, product, 1);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition shadow-md shadow-amber-950/40 active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Pedir Item</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-rose-400/80 font-semibold italic">
                            Esgotado no momento
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* --- SCENARIO 3: EXPRESS ORDER FORM --- */}
        {!completedOrder && activeCustomerTab === 'FORMULARIO' && (
          <form onSubmit={handleSubmitFormOrder} className="space-y-6">
            {submitError && (
              <div className="p-4 bg-rose-950/70 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* STEP 1: Identification */}
            <div className="bg-[#0e0e13] border border-[#242430] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <h2 className="font-display font-bold text-lg text-stone-100 flex items-center gap-2 border-b border-[#1f1f28] pb-3">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">1</span>
                <span>Seus Dados de Contato</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1.5">Seu Nome Completo *</label>
                  <input
                    id="input-customer-name"
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#121218] border border-[#242432] rounded-xl px-4 py-2.5 text-stone-100 text-xs focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1.5">WhatsApp / Telefone com DDD *</label>
                  <input
                    id="input-customer-phone"
                    type="tel"
                    required
                    placeholder="Ex: (44) 99996-1886"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-[#121218] border border-[#242432] rounded-xl px-4 py-2.5 text-stone-100 text-xs focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: Choose Meats (Carnes) */}
            <div className="bg-[#0e0e13] border border-[#242430] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1f1f28] pb-3">
                <h2 className="font-display font-bold text-lg text-stone-100 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Carnes Assadas Especiais (por kg ou unidade)</span>
                </h2>
                <span className="text-[11px] text-amber-400 font-semibold">Escolha o peso ou quantidade</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meats.map(meat => {
                  const inCart = selectedMeats.find(m => m.produto === meat.nome);
                  const soldByKg = isSoldByKg(meat.unidade);
                  const currentQty = inCart ? (inCart.pesoKg || 1) : 0;

                  return (
                    <div
                      key={meat.id}
                      className={`p-4 rounded-2xl border transition space-y-3 ${
                        inCart
                          ? 'bg-amber-950/30 border-amber-500/50 shadow-md shadow-amber-950/20'
                          : 'bg-[#121218] border-[#22222e] hover:border-[#2f2f3e]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-sm text-stone-100 flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-amber-400" />
                            <span>{meat.nome}</span>
                          </h3>
                          {meat.descricao && <p className="text-[11px] text-stone-400 mt-0.5">{meat.descricao}</p>}
                        </div>
                        <div className="text-right">
                          <span className="font-mono-clean font-bold text-emerald-400 text-sm">
                            {formatBRL(meat.preco)}
                          </span>
                          <span className="text-[10px] text-stone-400 block">/ {soldByKg ? 'kg' : 'un'}</span>
                        </div>
                      </div>

                      {/* Weight Selector for KG items */}
                      {soldByKg ? (
                        <div className="space-y-2 pt-1 border-t border-[#1a1a24]">
                          <label className="text-[11px] text-stone-400 font-semibold block">Selecionar Peso Desejado:</label>
                          <div className="grid grid-cols-4 gap-1.5 text-xs">
                            {[
                              { label: '500 g', kg: 0.5 },
                              { label: '1 kg', kg: 1.0 },
                              { label: '1,5 kg', kg: 1.5 },
                              { label: '2 kg', kg: 2.0 }
                            ].map(w => {
                              const isSelected = inCart && inCart.peso === w.label;
                              return (
                                <button
                                  key={w.label}
                                  type="button"
                                  onClick={() => handleAddOrUpdateMeat(meat, w.label, w.kg)}
                                  className={`py-1.5 rounded-xl font-semibold border transition text-center text-[11px] ${
                                    isSelected
                                      ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                                      : 'bg-[#181822] text-stone-300 border-[#282838] hover:bg-[#20202e]'
                                  }`}
                                >
                                  {w.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Extra larger weights + Remove */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex gap-1.5">
                              {[
                                { label: '2,5 kg', kg: 2.5 },
                                { label: '3 kg', kg: 3.0 }
                              ].map(w => (
                                <button
                                  key={w.label}
                                  type="button"
                                  onClick={() => handleAddOrUpdateMeat(meat, w.label, w.kg)}
                                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold ${
                                    inCart && inCart.peso === w.label
                                      ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                                      : 'bg-[#161620] text-stone-400 border-[#242432]'
                                  }`}
                                >
                                  {w.label}
                                </button>
                              ))}
                            </div>

                            {inCart && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMeat(meat.nome)}
                                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remover</span>
                              </button>
                            )}
                          </div>

                          {inCart && (
                            <div className="p-2 bg-amber-950/50 rounded-xl border border-amber-500/30 text-amber-200 text-xs flex justify-between items-center font-mono-clean">
                              <span>Total estimado ({inCart.peso}):</span>
                              <strong className="text-amber-400 font-bold">{formatBRL(inCart.subtotal)}</strong>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Unit selector for Unit (un) items (e.g. Frango Assado Inteiro) */
                        <div className="space-y-2 pt-1 border-t border-[#1a1a24]">
                          <label className="text-[11px] text-stone-400 font-semibold block">Quantidade (unidade):</label>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateMeatUnit(meat, -1)}
                                disabled={!inCart}
                                className="w-8 h-8 rounded-lg bg-[#181822] hover:bg-[#20202e] disabled:opacity-30 border border-[#282838] flex items-center justify-center font-bold text-stone-200"
                              >
                                -
                              </button>
                              <span className="w-10 text-center font-mono-clean font-bold text-sm text-stone-100">
                                {currentQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateMeatUnit(meat, 1)}
                                className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center shadow-md shadow-amber-950/40"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3].map(qty => (
                                <button
                                  key={qty}
                                  type="button"
                                  onClick={() => {
                                    const diff = qty - currentQty;
                                    handleUpdateMeatUnit(meat, diff);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${
                                    currentQty === qty
                                      ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                                      : 'bg-[#161620] text-stone-400 border-[#242432]'
                                  }`}
                                >
                                  {qty} un
                                </button>
                              ))}
                            </div>
                          </div>

                          {inCart && (
                            <div className="p-2 bg-amber-950/50 rounded-xl border border-amber-500/30 text-amber-200 text-xs flex justify-between items-center font-mono-clean">
                              <span>Total ({inCart.peso}):</span>
                              <strong className="text-amber-400 font-bold">{formatBRL(inCart.subtotal)}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 3: Sides & Drinks (Acompanhamentos & Bebidas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sides */}
              <div className="bg-[#0e0e13] border border-[#242430] rounded-3xl p-5 shadow-2xl space-y-4">
                <h2 className="font-display font-bold text-base text-stone-100 flex items-center gap-2 border-b border-[#1f1f28] pb-3">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Acompanhamentos da Casa</span>
                </h2>

                <div className="space-y-2.5">
                  {sides.map(side => {
                    const inCart = selectedSides.find(s => s.produto === side.nome);
                    const qty = inCart ? inCart.quantidade : 0;
                    return (
                      <div key={side.id} className="p-3 bg-[#121218] border border-[#22222e] rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-stone-200">{side.nome}</p>
                          <span className="font-mono-clean text-emerald-400">{formatBRL(side.preco)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateUnitItem('Acompanhamento', side, -1)}
                            disabled={qty <= 0}
                            className="w-7 h-7 rounded-lg bg-[#1a1a24] hover:bg-[#222230] border border-[#2a2a3c] flex items-center justify-center text-stone-300 disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-5 text-center font-bold text-stone-100 font-mono-clean">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateUnitItem('Acompanhamento', side, 1)}
                            className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 flex items-center justify-center font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Drinks */}
              <div className="bg-[#0e0e13] border border-[#242430] rounded-3xl p-5 shadow-2xl space-y-4">
                <h2 className="font-display font-bold text-base text-stone-100 flex items-center gap-2 border-b border-[#1f1f28] pb-3">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">4</span>
                  <span>Bebidas Geladas</span>
                </h2>

                <div className="space-y-2.5">
                  {drinks.map(drink => {
                    const inCart = selectedDrinks.find(d => d.produto === drink.nome);
                    const qty = inCart ? inCart.quantidade : 0;
                    return (
                      <div key={drink.id} className="p-3 bg-[#121218] border border-[#22222e] rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-stone-200">{drink.nome}</p>
                          <span className="font-mono-clean text-emerald-400">{formatBRL(drink.preco)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateUnitItem('Bebida', drink, -1)}
                            disabled={qty <= 0}
                            className="w-7 h-7 rounded-lg bg-[#1a1a24] hover:bg-[#222230] border border-[#2a2a3c] flex items-center justify-center text-stone-300 disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-5 text-center font-bold text-stone-100 font-mono-clean">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateUnitItem('Bebida', drink, 1)}
                            className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 flex items-center justify-center font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STEP 4: Delivery / Pickup Location */}
            <div className="bg-[#0e0e13] border border-[#242430] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <h2 className="font-display font-bold text-lg text-stone-100 flex items-center gap-2 border-b border-[#1f1f28] pb-3">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">5</span>
                <span>Entrega ou Retirada</span>
              </h2>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setTipoRecebimento('Entrega')}
                  className={`py-3 px-4 rounded-2xl border font-bold flex items-center justify-center gap-2 transition ${
                    tipoRecebimento === 'Entrega'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-md'
                      : 'bg-[#121218] text-stone-400 border-[#22222e]'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>🚚 Entrega no Endereço</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoRecebimento('Retirada')}
                  className={`py-3 px-4 rounded-2xl border font-bold flex items-center justify-center gap-2 transition ${
                    tipoRecebimento === 'Retirada'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500 shadow-md'
                      : 'bg-[#121218] text-stone-400 border-[#22222e]'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>🏬 Retirada no Balcão (Sem Taxa)</span>
                </button>
              </div>

              {/* Address & Delivery Time Fields if Delivery */}
              {tipoRecebimento === 'Entrega' ? (
                <div className="space-y-4 pt-2 text-xs">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1.5">
                      Bairro para Entrega * (Cálculo automático de taxa)
                    </label>
                    <select
                      id="select-bairro"
                      value={selectedBairro}
                      onChange={(e) => setSelectedBairro(e.target.value)}
                      required
                      className="w-full bg-[#121218] border border-[#242432] rounded-xl px-4 py-2.5 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Selecione seu bairro...</option>
                      {deliveryTaxes.map(tax => (
                        <option key={tax.id} value={tax.bairro}>
                          {tax.bairro} — Taxa: {formatBRL(tax.taxa)} {tax.tempoMin && tax.tempoMax ? `(${tax.tempoMin}-${tax.tempoMax} min)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-stone-300 font-semibold mb-1.5">Rua / Avenida *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Rua das Flores"
                        value={enderecoRua}
                        onChange={(e) => setEnderecoRua(e.target.value)}
                        className="w-full bg-[#121218] border border-[#242432] rounded-xl px-4 py-2.5 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-300 font-semibold mb-1.5">Número *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 120"
                        value={enderecoNumero}
                        onChange={(e) => setEnderecoNumero(e.target.value)}
                        className="w-full bg-[#121218] border border-[#242432] rounded-xl px-4 py-2.5 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-300 font-semibold mb-1.5">Complemento (Apto, Bloco)</label>
                      <input
                        type="text"
                        placeholder="Ex: Apto 302 Bloco B"
                        value={enderecoComplemento}
                        onChange={(e) => setEnderecoComplemento(e.target.value)}
                        className="w-full bg-[#121218] border border-[#242432] rounded-xl px-4 py-2.5 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-300 font-semibold mb-1.5">Ponto de Referência</label>
                      <input
                        type="text"
                        placeholder="Ex: Próximo à padaria"
                        value={enderecoReferencia}
                        onChange={(e) => setEnderecoReferencia(e.target.value)}
                        className="w-full bg-[#121218] border border-[#242432] rounded-xl px-4 py-2.5 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Delivery Time Slot Selector (10:00 to 15:00 every 15 min) */}
                  <div className="p-3.5 bg-[#121218] border border-[#242432] rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-stone-200 font-bold text-xs">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Horário Desejado para Entrega:</span>
                      </label>
                      <span className="font-mono-clean font-bold text-amber-400 text-xs px-2.5 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        {horarioEntrega}
                      </span>
                    </div>

                    <select
                      id="select-horario-entrega"
                      value={horarioEntrega}
                      onChange={(e) => setHorarioEntrega(e.target.value)}
                      className="w-full bg-[#181822] border border-[#2c2c3e] rounded-xl px-4 py-2 text-stone-100 font-mono-clean text-xs focus:outline-none focus:border-amber-500"
                    >
                      {AVAILABLE_TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot} {slot === '12:00' ? '(Horário de Pico)' : ''}
                        </option>
                      ))}
                    </select>

                    {/* Quick Selection Grid for 15-min slots */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Horários Disponíveis (15 em 15 min):</span>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
                        {AVAILABLE_TIME_SLOTS.map((slot) => {
                          const isSelected = horarioEntrega === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setHorarioEntrega(slot)}
                              className={`py-1 px-1.5 rounded-lg text-[11px] font-mono-clean font-semibold transition cursor-pointer text-center ${
                                isSelected
                                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-950/50 scale-[1.03]'
                                  : 'bg-[#181824] text-stone-400 hover:text-stone-200 hover:bg-[#222232] border border-[#222230]'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#121218] border border-[#242432] rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <Clock className="w-4 h-4" />
                      <span>Horário Previsto para Retirada no Balcão:</span>
                    </div>
                    <span className="font-mono-clean font-bold text-amber-400 text-xs px-2.5 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      {horarioRetirada}
                    </span>
                  </div>

                  <select
                    id="select-horario-retirada"
                    value={horarioRetirada}
                    onChange={(e) => setHorarioRetirada(e.target.value)}
                    className="w-full bg-[#181822] border border-[#2c2c3e] rounded-xl px-4 py-2 text-stone-100 font-mono-clean text-xs focus:outline-none focus:border-amber-500"
                  >
                    {AVAILABLE_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot} {slot === '12:00' ? '(Horário de Pico)' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Quick Selection Grid for 15-min slots */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Escolha o Horário de Retirada (10:00 às 15:00):</span>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
                      {AVAILABLE_TIME_SLOTS.map((slot) => {
                        const isSelected = horarioRetirada === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setHorarioRetirada(slot)}
                            className={`py-1 px-1.5 rounded-lg text-[11px] font-mono-clean font-semibold transition cursor-pointer text-center ${
                              isSelected
                                ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-950/50 scale-[1.03]'
                                : 'bg-[#181824] text-stone-400 hover:text-stone-200 hover:bg-[#222232] border border-[#222230]'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-400 pt-1">
                    Balcão aberto aos domingos das 10:00 às 15:00 para retirada imediata sem filas.
                  </p>
                </div>
              )}
            </div>

            {/* STEP 6: Payment & General Notes */}
            <div className="bg-[#0e0e13] border border-[#242430] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <h2 className="font-display font-bold text-lg text-stone-100 flex items-center gap-2 border-b border-[#1f1f28] pb-3">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">6</span>
                <span>Forma de Pagamento (Após a Pesagem)</span>
              </h2>

              {/* Informative notice about weighing */}
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200">
                <Scale className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-300">Pagamento após a pesagem dos itens:</p>
                  <p className="text-[11px] text-stone-300">
                    O valor final exato será atualizado após a pesagem das carnes na balança. Escolha como prefere pagar na entrega ou retirada:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setFormaPagamento('Cartão')}
                  className={`p-3.5 rounded-2xl border font-bold flex items-center gap-3 transition cursor-pointer ${
                    formaPagamento === 'Cartão'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-md'
                      : 'bg-[#121218] text-stone-400 border-[#22222e] hover:border-[#333346]'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${formaPagamento === 'Cartão' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#181822] text-stone-400'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-stone-100">Cartão (Débito / Crédito)</div>
                    <div className="text-[11px] text-stone-400 font-normal">Máquina de cartão na entrega ou balcão</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormaPagamento('Dinheiro')}
                  className={`p-3.5 rounded-2xl border font-bold flex items-center gap-3 transition cursor-pointer ${
                    formaPagamento === 'Dinheiro'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-md'
                      : 'bg-[#121218] text-stone-400 border-[#22222e] hover:border-[#333346]'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${formaPagamento === 'Dinheiro' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#181822] text-stone-400'}`}>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-stone-100">Dinheiro</div>
                    <div className="text-[11px] text-stone-400 font-normal">Pagamento em espécie na entrega ou balcão</div>
                  </div>
                </button>
              </div>

              {formaPagamento === 'Dinheiro' && (
                <div className="pt-2 text-xs">
                  <label className="block text-stone-300 font-semibold mb-1">Precisa de troco para quanto? (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 100,00"
                    value={trocoPara}
                    onChange={(e) => setTrocoPara(e.target.value)}
                    className="w-full sm:w-64 bg-[#121218] border border-[#242432] rounded-xl px-4 py-2 text-stone-100 font-mono-clean focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="pt-2 text-xs">
                <label className="block text-stone-300 font-semibold mb-1">Observações do Pedido (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Carne com pouca gordura, maionese bem gelada..."
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  className="w-full bg-[#121218] border border-[#242432] rounded-xl px-4 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* ORDER SUMMARY & FINAL SUBMIT BUTTON */}
            <div className="bg-gradient-to-br from-[#14141c] to-[#0e0e13] border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="space-y-2 border-b border-[#242432] pb-4">
                <div className="flex justify-between text-xs text-stone-400">
                  <span>Subtotal das Carnes:</span>
                  <span className="font-mono-clean">{formatBRL(subtotalCarnes)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-400">
                  <span>Subtotal de Acompanhamentos e Bebidas:</span>
                  <span className="font-mono-clean">{formatBRL(subtotalAcomp + subtotalBebidas)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-400">
                  <span>Taxa de Entrega:</span>
                  <span className="font-mono-clean text-emerald-400">
                    {tipoRecebimento === 'Retirada' ? 'Grátis (Retirada)' : formatBRL(taxaEntrega)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-lg font-bold text-stone-100 pt-2 border-t border-[#242434]">
                  <span>Total a Pagar:</span>
                  <span className="text-2xl font-mono-clean text-amber-400">{formatBRL(total)}</span>
                </div>
              </div>

              <button
                id="btn-submit-customer-order"
                type="submit"
                disabled={isSubmitting || total === 0}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-stone-950 font-extrabold text-base rounded-2xl transition shadow-xl shadow-amber-950/60 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span>
                    <span>Enviando Pedido para a Cozinha...</span>
                  </span>
                ) : (
                  <>
                    <Flame className="w-5 h-5" />
                    <span>🔥 Confirmar e Enviar Pedido ({formatBRL(total)})</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-stone-400">
                Ao clicar, seu pedido será enviado instantaneamente para a produção e você receberá seu comprovante digital.
              </p>
            </div>
          </form>
        )}

        {/* Footer info */}
        <footer className="text-center text-xs text-stone-400 space-y-1 pt-6 pb-12">
          <p>{config.empresa} • Sistema Oficial de Pedidos Online</p>
          <p className="text-[11px]">WhatsApp Oficial: {config.telefone}</p>
        </footer>
      </div>
    </div>
  );
};
