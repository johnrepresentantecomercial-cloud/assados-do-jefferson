import React, { useState } from 'react';
import { Order, OrderStatus, StoreConfig, FormaPagamento, OrderItemMeat } from '../types';
import { formatBRL, generateKitchenOrderText, generateWhatsAppReceiptText, generateWeightAdjustmentWhatsAppText } from '../utils/formatters';
import { exportOrdersToCSV } from '../utils/csvExport';
import { OrderWeightModal } from './OrderWeightModal';
import { SoldItemsReportModal } from './SoldItemsReportModal';
import { OrderStatusWhatsAppModal } from './OrderStatusWhatsAppModal';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Flame,
  FileText,
  MessageCircle,
  Copy,
  Check,
  Trash2,
  ChefHat,
  Eye,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Phone,
  Scale,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle,
  FileSpreadsheet,
  Printer,
  Download
} from 'lucide-react';

interface OrdersManagerProps {
  orders: Order[];
  config: StoreConfig;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onDeleteCanceledOrders?: () => Promise<number | void>;
  onOpenReceipt: (order: Order) => void;
  onRefresh: () => void;
  onUpdateOrder?: (orderId: string, updates: Partial<Order>) => Promise<void>;
  onFinalizeAndLaunchToCash?: (orderId: string, paymentMethod?: FormaPagamento, notes?: string) => Promise<void>;
  onReopenOrder?: (orderId: string) => Promise<void>;
}

export const OrdersManager: React.FC<OrdersManagerProps> = ({
  orders,
  config,
  onUpdateStatus,
  onDeleteOrder,
  onDeleteCanceledOrders,
  onOpenReceipt,
  onRefresh,
  onUpdateOrder,
  onFinalizeAndLaunchToCash,
  onReopenOrder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mainTab, setMainTab] = useState<'ATIVOS' | 'FINALIZADOS' | 'CANCELADOS' | 'TODOS'>('ATIVOS');
  const [subStatusFilter, setSubStatusFilter] = useState<string>('TODOS');
  const [copiedKitchenId, setCopiedKitchenId] = useState<string | null>(null);
  const [selectedWeightOrder, setSelectedWeightOrder] = useState<Order | null>(null);

  // Modal State for Finalize & Launch to Cash
  const [finalizingOrder, setFinalizingOrder] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<FormaPagamento>('PIX');
  const [cashGiven, setCashGiven] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [isFinalizingLoading, setIsFinalizingLoading] = useState(false);

  // Modal State for Sold Items & Weight Report
  const [isSoldItemsModalOpen, setIsSoldItemsModalOpen] = useState(false);

  // Modal State for WhatsApp Status & PIX Notification
  const [whatsappModalOrder, setWhatsappModalOrder] = useState<Order | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; showReportButton?: boolean } | null>(null);

  const showToast = (text: string, showReportButton = true) => {
    setToastMessage({ text, showReportButton });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Stats calculation
  const totalRevenue = orders.reduce((acc, o) => o.status !== 'CANCELADO' ? acc + o.total : acc, 0);
  const activeOrders = orders.filter(o => o.status !== 'FINALIZADO' && o.status !== 'CANCELADO');
  const finalizedOrders = orders.filter(o => o.status === 'FINALIZADO' || o.lancadoNoCaixa);
  const canceledOrders = orders.filter(o => o.status === 'CANCELADO');

  const inPrepCount = activeOrders.filter(o => o.status === 'EM_PREPARACAO' || o.status === 'CONFIRMADO' || o.status === 'NOVO').length;
  const readyCount = activeOrders.filter(o => o.status === 'PRONTO' || o.status === 'SAIU_PARA_ENTREGA').length;

  // Filter orders according to mainTab and subStatusFilter
  const filteredOrders = orders.filter(o => {
    if (mainTab === 'ATIVOS' && (o.status === 'FINALIZADO' || o.status === 'CANCELADO')) {
      return false;
    }
    if (mainTab === 'FINALIZADOS' && o.status !== 'FINALIZADO' && !o.lancadoNoCaixa) {
      return false;
    }
    if (mainTab === 'CANCELADOS' && o.status !== 'CANCELADO') {
      return false;
    }

    if (mainTab === 'ATIVOS' && subStatusFilter !== 'TODOS') {
      if (o.status !== subStatusFilter) return false;
    }

    const matchesSearch =
      o.numeroPedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.clienteTelefone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.enderecoBairro && o.enderecoBairro.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const handleCopyKitchen = (order: Order) => {
    const text = generateKitchenOrderText(order);
    navigator.clipboard.writeText(text);
    setCopiedKitchenId(order.id);
    setTimeout(() => setCopiedKitchenId(null), 2000);
  };

  const handleSaveWeights = async (
    orderId: string,
    updatedMeats: OrderItemMeat[],
    newSubtotal: number,
    newTotal: number
  ) => {
    if (onUpdateOrder) {
      await onUpdateOrder(orderId, {
        carnes: updatedMeats,
        subtotal: newSubtotal,
        total: newTotal,
        pesagemFinalizada: true
      });
      showToast('Pesagem da balança salva e total recalculado com sucesso!');
      onRefresh();
    }
  };

  const handleConfirmFinalize = async () => {
    if (!finalizingOrder || !onFinalizeAndLaunchToCash) return;
    setIsFinalizingLoading(true);
    try {
      await onFinalizeAndLaunchToCash(finalizingOrder.id, selectedPaymentMethod, checkoutNotes);
      showToast(`Pedido ${finalizingOrder.numeroPedido} finalizado e lançado no Caixa!`);
      setFinalizingOrder(null);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsFinalizingLoading(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'NOVO':
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">NOVO PEDIDO</span>;
      case 'CONFIRMADO':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-full text-xs font-bold">CONFIRMADO</span>;
      case 'EM_PREPARACAO':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-bold">EM PREPARO</span>;
      case 'PRONTO':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold">PRONTO / EMBALADO</span>;
      case 'SAIU_PARA_ENTREGA':
        return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-full text-xs font-bold">SAIU ENTREGA</span>;
      case 'FINALIZADO':
        return <span className="bg-stone-800 text-stone-300 border border-stone-700 px-2.5 py-1 rounded-full text-xs font-bold">FINALIZADO (CAIXA)</span>;
      case 'CANCELADO':
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full text-xs font-bold">CANCELADO</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans-clean">
      {/* Top Header & Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121218] border border-[#222230] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Faturamento Bruto</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-display font-extrabold text-emerald-400">
            {formatBRL(totalRevenue)}
          </p>
        </div>

        <div className="bg-[#121218] border border-[#222230] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Pedidos Em Aberto</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-display font-extrabold text-amber-400">
            {activeOrders.length}
          </p>
        </div>

        <div className="bg-[#121218] border border-[#222230] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Em Fogo / Preparo</span>
            <ChefHat className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-display font-extrabold text-blue-400">
            {inPrepCount}
          </p>
        </div>

        <div className="bg-[#121218] border border-[#222230] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Prontos p/ Retirada</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-xl font-display font-extrabold text-teal-400">
            {readyCount}
          </p>
        </div>
      </div>

      {/* Main Navigation Tabs & Controls */}
      <div className="bg-[#121218] border border-[#222230] rounded-3xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => { setMainTab('ATIVOS'); setSubStatusFilter('TODOS'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                mainTab === 'ATIVOS'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/60'
                  : 'bg-[#191924] text-stone-400 hover:text-stone-200'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Pedidos em Aberto ({activeOrders.length})</span>
            </button>

            <button
              onClick={() => { setMainTab('FINALIZADOS'); setSubStatusFilter('TODOS'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                mainTab === 'FINALIZADOS'
                  ? 'bg-emerald-600 text-stone-950 shadow-md shadow-emerald-950/60'
                  : 'bg-[#191924] text-stone-400 hover:text-stone-200'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Finalizados / Caixa ({finalizedOrders.length})</span>
            </button>

            <button
              onClick={() => { setMainTab('CANCELADOS'); setSubStatusFilter('TODOS'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                mainTab === 'CANCELADOS'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/60'
                  : 'bg-[#191924] text-stone-400 hover:text-stone-200'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Cancelados ({canceledOrders.length})</span>
            </button>

            <button
              onClick={() => { setMainTab('TODOS'); setSubStatusFilter('TODOS'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                mainTab === 'TODOS'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/60'
                  : 'bg-[#191924] text-stone-400 hover:text-stone-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Todos ({orders.length})</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                exportOrdersToCSV(
                  filteredOrders,
                  `pedidos_${mainTab.toLowerCase()}${subStatusFilter !== 'TODOS' ? `_${subStatusFilter.toLowerCase()}` : ''}`
                );
                showToast(`${filteredOrders.length} pedido(s) exportado(s) para CSV com sucesso!`, false);
              }}
              disabled={filteredOrders.length === 0}
              title="Exportar a lista atual filtrada para planilha Excel / CSV contábil"
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1c1c28] hover:bg-[#28283a] text-stone-200 hover:text-white border border-[#2e2e42] disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition shadow-sm"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Exportar CSV ({filteredOrders.length})</span>
            </button>

            <button
              onClick={() => setIsSoldItemsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-950 font-bold text-xs rounded-xl transition shadow-md shadow-emerald-950/40"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Relatório de Carnes (KG)</span>
            </button>
          </div>
        </div>

        {/* Search & Sub Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#1e1e2b]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por número do pedido, cliente, telefone ou bairro..."
              className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none transition"
            />
          </div>

          {mainTab === 'ATIVOS' && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs text-stone-500 shrink-0 font-medium">Status:</span>
              {['TODOS', 'NOVO', 'CONFIRMADO', 'EM_PREPARACAO', 'PRONTO', 'SAIU_PARA_ENTREGA'].map(s => (
                <button
                  key={s}
                  onClick={() => setSubStatusFilter(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    subStatusFilter === s
                      ? 'bg-stone-200 text-stone-950 font-bold'
                      : 'bg-[#181824] text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {s === 'TODOS' ? 'Todos Ativos' : s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-[#121218] border border-[#222230] rounded-3xl p-12 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-stone-600 mx-auto" />
            <h3 className="font-display font-bold text-stone-300 text-base">Nenhum pedido encontrado</h3>
            <p className="text-xs text-stone-500">
              {searchTerm ? 'Nenhum resultado para a busca aplicada.' : 'Não há pedidos nesta categoria no momento.'}
            </p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isFreshOrder = Date.now() - order.criadoEm < 120000;
            return (
              <div
                key={order.id}
                className={`bg-[#121218] border transition rounded-3xl p-5 shadow-xl space-y-4 ${
                  isFreshOrder
                    ? 'border-amber-500/80 shadow-amber-950/40 ring-2 ring-amber-500/30'
                    : 'border-[#222230] hover:border-[#2f2f44]'
                }`}
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e1e2b]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center font-mono font-bold text-stone-950 text-sm">
                      {order.numeroPedido.replace('#PEDIDO-', '')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-bold text-base text-stone-100">{order.clienteNome}</h4>
                        {isFreshOrder && (
                          <span className="bg-amber-500 text-stone-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-bounce">
                            NOVO!
                          </span>
                        )}
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-stone-400 flex flex-wrap items-center gap-2">
                        <span>{order.clienteTelefone}</span>
                        <span>•</span>
                        <span className="font-semibold text-amber-400">{order.tipoRecebimento}</span>
                        <span>•</span>
                        <span>Previsão: <strong>{order.horario}</strong></span>
                        <button
                          type="button"
                          onClick={() => setWhatsappModalOrder(order)}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-semibold transition cursor-pointer ml-1"
                          title="Enviar notificação no WhatsApp deste cliente"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-400" />
                          <span>Avisar Cliente</span>
                        </button>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-stone-400">Total do Pedido</span>
                    <p className="font-mono font-extrabold text-lg text-emerald-400">
                      {formatBRL(order.total)}
                    </p>
                    <span className="text-[11px] text-stone-400 font-medium">
                      Pagamento: <strong className="text-stone-200">{order.formaPagamento}</strong>
                    </span>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left: Meats */}
                  <div className="bg-[#181824] border border-[#242436] rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Carnes ({order.carnes.length})</span>
                      </span>
                      <button
                        onClick={() => setSelectedWeightOrder(order)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] rounded-lg border border-amber-500/30 transition"
                      >
                        <Scale className="w-3 h-3" />
                        <span>{order.pesagemFinalizada ? 'Ajustar Peso Real' : 'Pesar na Balança'}</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {order.carnes.map((c, idx) => (
                        <div key={idx} className="flex justify-between items-center text-stone-200">
                          <div>
                            <span className="font-semibold">{c.produto}</span>
                            <span className="text-stone-400 ml-1.5">
                              {c.pesoRealKg ? `(${c.pesoRealKg.toFixed(3)} kg Real)` : `(${c.peso})`}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-stone-300">
                            {formatBRL(c.subtotalReal || c.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Sides, Drinks & Details */}
                  <div className="bg-[#181824] border border-[#242436] rounded-2xl p-3.5 space-y-2">
                    <span className="font-bold text-teal-400 uppercase tracking-wider text-[11px]">
                      Acompanhamentos & Entrega
                    </span>

                    <div className="space-y-1 text-stone-300">
                      {order.acompanhamentos.map((a, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{a.quantidade}x {a.produto} {a.sabor ? `(${a.sabor})` : ''}</span>
                          <span className="font-mono">{formatBRL(a.subtotal)}</span>
                        </div>
                      ))}

                      {order.bebidas.map((b, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{b.quantidade}x {b.produto}</span>
                          <span className="font-mono">{formatBRL(b.subtotal)}</span>
                        </div>
                      ))}

                      {order.tipoRecebimento === 'Entrega' && (
                        <div className="pt-1.5 border-t border-[#252538] text-[11px] text-stone-400">
                          <p><strong>Endereço:</strong> {order.enderecoRua}, {order.enderecoNumero} - {order.enderecoBairro}</p>
                          {order.enderecoComplemento && <p><strong>Compl:</strong> {order.enderecoComplemento}</p>}
                        </div>
                      )}

                      {order.observacoes && (
                        <div className="pt-1 text-[11px] text-amber-300">
                          <strong>Obs:</strong> {order.observacoes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Advancement & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1e1e2b]">
                  {/* Status Steps Flow */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {(['NOVO', 'CONFIRMADO', 'EM_PREPARACAO', 'PRONTO', 'SAIU_PARA_ENTREGA'] as OrderStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => onUpdateStatus(order.id, st)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition ${
                          order.status === st
                            ? 'bg-amber-500 text-stone-950 shadow-md'
                            : 'bg-[#191926] text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {st.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Operation Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setWhatsappModalOrder(order)}
                      title="Notificar cliente sobre status ou chave PIX via WhatsApp"
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleCopyKitchen(order)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#1b1b26] hover:bg-[#252536] text-stone-300 text-xs font-semibold rounded-xl transition"
                    >
                      {copiedKitchenId === order.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKitchenId === order.id ? 'Copiado!' : 'Cozinha'}</span>
                    </button>

                    <button
                      onClick={() => onOpenReceipt(order)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#1b1b26] hover:bg-[#252536] text-stone-300 text-xs font-semibold rounded-xl transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Comprovante</span>
                    </button>

                    {order.status !== 'FINALIZADO' ? (
                      <button
                        onClick={() => {
                          setFinalizingOrder(order);
                          setSelectedPaymentMethod(order.formaPagamento || 'PIX');
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-950/40"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Receber & Lançar no Caixa</span>
                      </button>
                    ) : (
                      onReopenOrder && (
                        <button
                          onClick={() => onReopenOrder(order.id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#1f1f2e] hover:bg-[#2b2b3f] text-stone-300 text-xs font-semibold rounded-xl transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reabrir Pedido</span>
                        </button>
                      )
                    )}

                    <button
                      onClick={() => onUpdateStatus(order.id, 'CANCELADO')}
                      title="Cancelar pedido"
                      className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-950/20 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Weight Modal */}
      {selectedWeightOrder && (
        <OrderWeightModal
          order={selectedWeightOrder}
          onClose={() => setSelectedWeightOrder(null)}
          onSaveWeights={handleSaveWeights}
        />
      )}

      {/* Sold Items Modal */}
      {isSoldItemsModalOpen && (
        <SoldItemsReportModal
          orders={orders}
          onClose={() => setIsSoldItemsModalOpen(false)}
        />
      )}

      {/* WhatsApp Status & PIX Notification Modal */}
      {whatsappModalOrder && (
        <OrderStatusWhatsAppModal
          order={whatsappModalOrder}
          config={config}
          onClose={() => setWhatsappModalOrder(null)}
          onUpdateStatus={onUpdateStatus}
        />
      )}

      {/* Finalize and Cash Register Modal */}
      {finalizingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121218] border border-[#28283a] rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#20202e]">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-base">
                <DollarSign className="w-5 h-5" />
                <span>Lançar no Caixa Financeiro</span>
              </div>
              <span className="font-mono text-sm font-bold text-stone-300">{finalizingOrder.numeroPedido}</span>
            </div>

            <div className="space-y-1 text-xs text-stone-300">
              <p>Cliente: <strong>{finalizingOrder.clienteNome}</strong></p>
              <p>Total a receber: <strong className="text-emerald-400 text-base">{formatBRL(finalizingOrder.total)}</strong></p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">Forma de Pagamento Confirmada:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['PIX', 'Dinheiro', 'Cartão'] as FormaPagamento[]).map(fp => (
                  <button
                    key={fp}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(fp)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition ${
                      selectedPaymentMethod === fp
                        ? 'bg-emerald-500 text-stone-950 shadow-md'
                        : 'bg-[#181824] text-stone-300 hover:bg-[#202030]'
                    }`}
                  >
                    {fp}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#20202e]">
              <button
                type="button"
                onClick={() => setFinalizingOrder(null)}
                className="px-4 py-2.5 bg-[#20202e] text-stone-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalize}
                disabled={isFinalizingLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-stone-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-950/40"
              >
                <Check className="w-4 h-4" />
                <span>{isFinalizingLoading ? 'Lançando...' : 'Confirmar e Finalizar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161622] border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
