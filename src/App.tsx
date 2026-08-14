import React, { useState, useEffect, useCallback } from 'react';
import {
  Order,
  Product,
  DeliveryTax,
  StoreConfig,
  CashRegisterSummary,
  OrderStatus,
  FormaPagamento,
  CashTransaction
} from './types';
import { OrdersManager } from './components/OrdersManager';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { CashRegisterManager } from './components/CashRegisterManager';
import { DatabaseTablesManager } from './components/DatabaseTablesManager';
import { WhatsAppLinkGenerator } from './components/WhatsAppLinkGenerator';
import { MetaIntegrationGuide } from './components/MetaIntegrationGuide';
import { CustomerWebOrder } from './components/CustomerWebOrder';
import { OrderReceiptModal } from './components/OrderReceiptModal';
import { formatBRL } from './utils/formatters';
import {
  Flame,
  ShoppingBag,
  Bot,
  DollarSign,
  Database,
  Link2,
  Share2,
  Download,
  Bell,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<
    'ORDERS' | 'CHATBOT' | 'CASH_REGISTER' | 'DATABASE' | 'LINKS' | 'META'
  >('ORDERS');

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryTaxes, setDeliveryTaxes] = useState<DeliveryTax[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    empresa: 'Assados do Jeferson',
    telefone: '(44) 99996-1886',
    chavePix: 'assadosdojeferson@gmail.com',
    tipoPix: 'Chave E-mail',
    horarioInicio: '09:30',
    horarioFim: '14:30',
    horarioRetiradaInicio: '10:30',
    horarioRetiradaFim: '14:00',
    taxaPadrao: 8.0,
    tempoPreparo: '30 a 45 min'
  });
  const [cashSummary, setCashSummary] = useState<CashRegisterSummary | null>(null);

  // Modal / Receipt state
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  // Real-time toast alert for new incoming orders
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Customer preview & route detection
  const [forceCustomerView, setForceCustomerView] = useState(false);

  // Detect customer mode from URL or query
  const isCustomerMode =
    forceCustomerView ||
    (typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).get('view') === 'cardapio' ||
        new URLSearchParams(window.location.search).get('view') === 'pedido' ||
        new URLSearchParams(window.location.search).get('origem') === 'web' ||
        window.location.pathname.startsWith('/cardapio') ||
        window.location.pathname.startsWith('/pedido') ||
        window.location.pathname.includes('cardapio') ||
        window.location.pathname.includes('pedido') ||
        window.location.hash.includes('cardapio') ||
        window.location.hash.includes('pedido')));

  // Play modern chime sound on new order
  const playOrderChime = useCallback(() => {
    if (!isSoundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Play a harmonic 3-tone notification chord
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.4);
      });
    } catch (e) {
      console.log('Audio chime not ready yet:', e);
    }
  }, [isSoundEnabled]);

  // Main data fetcher
  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, prodsRes, taxesRes, configRes, cashRes] = await Promise.all([
        fetch('/api/database/orders'),
        fetch('/api/database/products'),
        fetch('/api/database/delivery-taxes'),
        fetch('/api/database/config'),
        fetch('/api/database/cash-register')
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData);
      }
      if (prodsRes.ok) {
        const pData = await prodsRes.json();
        setProducts(pData);
      }
      if (taxesRes.ok) {
        const tData = await taxesRes.json();
        setDeliveryTaxes(tData);
      }
      if (configRes.ok) {
        const cData = await configRes.json();
        setStoreConfig(cData);
      }
      if (cashRes.ok) {
        const csData = await cashRes.json();
        setCashSummary(csData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }, []);

  // Real-time synchronization setup
  useEffect(() => {
    fetchData();

    // 1. Server-Sent Events (SSE) for instant zero-latency backend push
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'NEW_ORDER' && parsed.data) {
            const newOrd: Order = parsed.data;
            setOrders(prev => {
              if (prev.some(o => o.id === newOrd.id)) return prev;
              return [newOrd, ...prev];
            });
            setNewOrderAlert(newOrd);
            playOrderChime();
          } else if (parsed.type === 'ORDER_STATUS_CHANGED' || parsed.type === 'ORDER_UPDATED') {
            const updatedOrd: Order = parsed.data;
            setOrders(prev => prev.map(o => (o.id === updatedOrd.id ? updatedOrd : o)));
          } else if (
            parsed.type === 'ORDERS_CHANGED' ||
            parsed.type === 'ORDER_FINALIZED' ||
            parsed.type === 'ORDER_REOPENED'
          ) {
            fetchData();
          } else if (parsed.type === 'CASH_TRANSACTION' && parsed.data?.summary) {
            setCashSummary(parsed.data.summary);
          }
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      };

      eventSource.onerror = () => {
        // SSE auto-reconnects
      };
    } catch (err) {
      console.error('Error initializing SSE:', err);
    }

    // 2. BroadcastChannel for instant same-browser tab-to-tab synchronization
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('assados_orders_channel');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'NEW_ORDER' && msg.data?.order) {
          const ord: Order = msg.data.order;
          setOrders(prev => {
            if (prev.some(o => o.id === ord.id)) return prev;
            return [ord, ...prev];
          });
          setNewOrderAlert(ord);
          playOrderChime();
          fetchData();
        }
      };
    }

    // 3. Storage event fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'assados_last_order_ts') {
        fetchData();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Polling fallback every 4 seconds to guarantee sync
    const interval = setInterval(fetchData, 4000);

    return () => {
      eventSource?.close();
      bc?.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [fetchData, playOrderChime]);

  // Order CRUD handlers
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/database/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateOrder = async (orderId: string, updates: Partial<Order>) => {
    try {
      const res = await fetch(`/api/database/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/database/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCanceledOrders = async () => {
    try {
      const res = await fetch('/api/database/orders/canceled', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        fetchData();
        return data.count;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinalizeAndLaunchToCash = async (
    orderId: string,
    paymentMethod?: FormaPagamento,
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/database/cash-register/finalize-order/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formaPagamento: paymentMethod, observacao: notes })
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(prev => prev.map(o => (o.id === orderId ? data.order : o)));
        if (data.summary) setCashSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReopenOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/database/cash-register/reopen-order/${orderId}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(prev => prev.map(o => (o.id === orderId ? data.order : o)));
        if (data.summary) setCashSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cash transaction handler
  const handleAddTransaction = async (
    tx: Omit<CashTransaction, 'id' | 'dataHora' | 'criadoEm'>
  ) => {
    try {
      const res = await fetch('/api/database/cash-register/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) setCashSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Product CRUD
  const handleAddProduct = async (prod: Omit<Product, 'id'>) => {
    const res = await fetch('/api/database/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prod)
    });
    if (res.ok) fetchData();
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const res = await fetch(`/api/database/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) fetchData();
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await fetch(`/api/database/products/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  // Delivery Tax CRUD
  const handleAddDeliveryTax = async (tax: Omit<DeliveryTax, 'id'>) => {
    const res = await fetch('/api/database/delivery-taxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tax)
    });
    if (res.ok) fetchData();
  };

  const handleUpdateDeliveryTax = async (id: string, updates: Partial<DeliveryTax>) => {
    const res = await fetch(`/api/database/delivery-taxes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) fetchData();
  };

  const handleDeleteDeliveryTax = async (id: string) => {
    const res = await fetch(`/api/database/delivery-taxes/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  // Config Update
  const handleUpdateConfig = async (updates: Partial<StoreConfig>) => {
    const res = await fetch('/api/database/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      const c = await res.json();
      setStoreConfig(c);
    }
  };

  const handleDownloadProjectZip = () => {
    setIsDownloadingZip(true);
    window.location.href = '/api/download-zip';
    setTimeout(() => setIsDownloadingZip(false), 3000);
  };

  // Render Customer Web App if in customer mode
  if (isCustomerMode) {
    return (
      <CustomerWebOrder
        products={products}
        deliveryTaxes={deliveryTaxes}
        config={storeConfig}
        isAdminViewing={forceCustomerView}
        onExitToAdmin={() => setForceCustomerView(false)}
        onOrderCreated={() => {
          fetchData();
        }}
      />
    );
  }

  const activeOrdersCount = orders.filter(
    o => o.status !== 'FINALIZADO' && o.status !== 'CANCELADO'
  ).length;

  return (
    <div className="min-h-screen bg-[#070709] text-stone-100 flex flex-col font-sans-clean">
      {/* Top Main Navbar */}
      <header className="sticky top-0 z-40 bg-[#0e0e14]/90 backdrop-blur-md border-b border-[#1c1c28]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 p-0.5 shadow-lg shadow-amber-950/50">
              <div className="w-full h-full bg-[#0e0e14] rounded-[14px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div>
              <h1 className="font-display font-extrabold text-base sm:text-lg text-stone-100 tracking-tight flex items-center gap-2">
                <span>{storeConfig.empresa}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                  Gestão & WhatsApp
                </span>
              </h1>
              <p className="text-[11px] text-stone-400">
                Sincronização em tempo real de pedidos web, balcão e WhatsApp
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Audio chime toggle */}
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              title={isSoundEnabled ? 'Notificação sonora ativada' : 'Notificação sonora silenciada'}
              className={`p-2 rounded-xl transition ${
                isSoundEnabled
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-[#181824] text-stone-500 hover:text-stone-300'
              }`}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchData}
              title="Atualizar dados agora"
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-[#181824] rounded-xl transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Preview Cardapio View inside Admin */}
            <button
              onClick={() => setForceCustomerView(true)}
              title="Pré-visualizar o cardápio exatamente como o cliente vê"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#181824] hover:bg-[#222232] text-stone-300 text-xs font-semibold rounded-xl border border-[#2a2a3c] transition shadow-sm"
            >
              <span>👁️ Ver Cardápio Web</span>
            </button>

            {/* Download Project ZIP */}
            <button
              onClick={handleDownloadProjectZip}
              disabled={isDownloadingZip}
              title="Baixar código do projeto compactado (.ZIP)"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#181824] hover:bg-[#222232] text-stone-300 text-xs font-semibold rounded-xl border border-[#2a2a3c] transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isDownloadingZip ? 'Baixando...' : '.ZIP'}</span>
            </button>

            {/* Open Cardapio Link in new tab */}
            <a
              href="/cardapio.html"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-extrabold rounded-xl transition shadow-md shadow-amber-950/40"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Abrir Cardápio HTML</span>
            </a>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#181824]">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2.5 scrollbar-none">
            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'ORDERS'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/60'
                  : 'bg-[#121218] text-stone-400 hover:text-stone-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Gestão de Pedidos</span>
              {activeOrdersCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'ORDERS' ? 'bg-stone-950 text-amber-400' : 'bg-amber-500 text-stone-950'
                  }`}
                >
                  {activeOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('CHATBOT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'CHATBOT'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/60'
                  : 'bg-[#121218] text-stone-400 hover:text-stone-200'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Atendente IA (Simulador)</span>
            </button>

            <button
              onClick={() => setActiveTab('CASH_REGISTER')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'CASH_REGISTER'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/60'
                  : 'bg-[#121218] text-stone-400 hover:text-stone-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Fluxo de Caixa</span>
            </button>

            <button
              onClick={() => setActiveTab('DATABASE')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'DATABASE'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/60'
                  : 'bg-[#121218] text-stone-400 hover:text-stone-200'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Base de Dados & Cardápio</span>
            </button>

            <button
              onClick={() => setActiveTab('LINKS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'LINKS'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/60'
                  : 'bg-[#121218] text-stone-400 hover:text-stone-200'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Links & QR Code</span>
            </button>

            <button
              onClick={() => setActiveTab('META')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'META'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950/60'
                  : 'bg-[#121218] text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Meta WhatsApp API</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'ORDERS' && (
          <OrdersManager
            orders={orders}
            config={storeConfig}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onDeleteCanceledOrders={handleDeleteCanceledOrders}
            onOpenReceipt={setSelectedReceiptOrder}
            onRefresh={fetchData}
            onUpdateOrder={handleUpdateOrder}
            onFinalizeAndLaunchToCash={handleFinalizeAndLaunchToCash}
            onReopenOrder={handleReopenOrder}
          />
        )}

        {activeTab === 'CHATBOT' && (
          <WhatsAppSimulator
            config={storeConfig}
            onOpenReceipt={setSelectedReceiptOrder}
            onOrderCreated={fetchData}
            onNavigateToLinkGenerator={() => setActiveTab('LINKS')}
          />
        )}

        {activeTab === 'CASH_REGISTER' && (
          <CashRegisterManager
            summary={cashSummary}
            config={storeConfig}
            orders={orders}
            onRefresh={fetchData}
            onOpenReceipt={setSelectedReceiptOrder}
            onAddTransaction={handleAddTransaction}
            onReopenOrder={handleReopenOrder}
          />
        )}

        {activeTab === 'DATABASE' && (
          <DatabaseTablesManager
            products={products}
            deliveryTaxes={deliveryTaxes}
            config={storeConfig}
            orders={orders}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddDeliveryTax={handleAddDeliveryTax}
            onUpdateDeliveryTax={handleUpdateDeliveryTax}
            onDeleteDeliveryTax={handleDeleteDeliveryTax}
            onUpdateConfig={handleUpdateConfig}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'LINKS' && <WhatsAppLinkGenerator config={storeConfig} />}

        {activeTab === 'META' && (
          <MetaIntegrationGuide
            config={storeConfig}
            onUpdateConfig={handleUpdateConfig}
            onRefresh={fetchData}
          />
        )}
      </main>

      {/* Receipt Modal */}
      {selectedReceiptOrder && (
        <OrderReceiptModal
          order={selectedReceiptOrder}
          config={storeConfig}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}

      {/* Floating New Order Toast Alert */}
      {newOrderAlert && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full bg-gradient-to-r from-amber-500 to-orange-600 text-stone-950 p-4 rounded-3xl shadow-2xl shadow-amber-950/60 border border-amber-300 flex items-start gap-3 animate-bounce">
          <div className="p-2 bg-stone-950 text-amber-400 rounded-2xl shrink-0">
            <Bell className="w-5 h-5 animate-spin" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-extrabold text-sm uppercase tracking-wide">
                Novo Pedido Confirmado!
              </h4>
              <button
                onClick={() => setNewOrderAlert(null)}
                className="p-1 hover:bg-black/20 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-semibold">
              {newOrderAlert.numeroPedido} • {newOrderAlert.clienteNome} ({newOrderAlert.tipoRecebimento})
            </p>
            <p className="text-xs font-bold font-mono">
              Total: {formatBRL(newOrderAlert.total)}
            </p>
            <div className="pt-1 flex gap-2">
              <button
                onClick={() => {
                  setSelectedReceiptOrder(newOrderAlert);
                  setNewOrderAlert(null);
                }}
                className="px-3 py-1 bg-stone-950 text-amber-400 text-[11px] font-extrabold rounded-xl"
              >
                Ver Comprovante
              </button>
              <button
                onClick={() => {
                  setActiveTab('ORDERS');
                  setNewOrderAlert(null);
                }}
                className="px-3 py-1 bg-white/20 text-stone-950 text-[11px] font-extrabold rounded-xl"
              >
                Ver na Gestão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
