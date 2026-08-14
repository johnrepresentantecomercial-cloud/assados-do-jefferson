import React, { useState, useRef } from 'react';
import { Product, DeliveryTax, StoreConfig, ProductCategory, Order } from '../types';
import { formatBRL } from '../utils/formatters';
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Flame,
  Truck,
  Settings,
  DollarSign,
  Download,
  FileArchive,
  Save,
  Power,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  FileJson,
  Upload,
  RefreshCw,
  HardDriveDownload,
  ShieldCheck
} from 'lucide-react';

interface DatabaseTablesManagerProps {
  products: Product[];
  deliveryTaxes: DeliveryTax[];
  config: StoreConfig;
  orders?: Order[];
  onAddProduct: (prod: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddDeliveryTax: (tax: Omit<DeliveryTax, 'id'>) => Promise<void>;
  onUpdateDeliveryTax: (id: string, updates: Partial<DeliveryTax>) => Promise<void>;
  onDeleteDeliveryTax: (id: string) => Promise<void>;
  onUpdateConfig: (updates: Partial<StoreConfig>) => Promise<void>;
  onRefresh: () => void;
}

export const DatabaseTablesManager: React.FC<DatabaseTablesManagerProps> = ({
  products,
  deliveryTaxes,
  config,
  orders = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddDeliveryTax,
  onUpdateDeliveryTax,
  onDeleteDeliveryTax,
  onUpdateConfig,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'TAXES' | 'CONFIG' | 'BACKUP' | 'DOWNLOAD'>('PRODUCTS');

  // Product Modal State
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [prodNome, setProdNome] = useState('');
  const [prodCategoria, setProdCategoria] = useState<ProductCategory>('Carne');
  const [prodPreco, setProdPreco] = useState('');
  const [prodUnidade, setProdUnidade] = useState('kg');
  const [prodDescricao, setProdDescricao] = useState('');
  const [prodAtivo, setProdAtivo] = useState(true);

  // Delivery Tax Modal State
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<DeliveryTax | null>(null);
  const [taxBairro, setTaxBairro] = useState('');
  const [taxValor, setTaxValor] = useState('');
  const [taxMin, setTaxMin] = useState('20');
  const [taxMax, setTaxMax] = useState('35');
  const [taxAtivo, setTaxAtivo] = useState(true);

  // Delete Confirmation Modal State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deletingTax, setDeletingTax] = useState<DeliveryTax | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Action feedback toast
  const [toggleFeedback, setToggleFeedback] = useState<string | null>(null);

  // Store Config State
  const [storeConfigForm, setStoreConfigForm] = useState<StoreConfig>(config);
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [configSavedToast, setConfigSavedToast] = useState(false);

  // Download ZIP state
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Backup & Restore State
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackupJson = async () => {
    setIsExportingBackup(true);
    try {
      // Fetch full backup from server or assemble directly
      let backupData: any = null;
      try {
        const res = await fetch('/api/database/backup');
        if (res.ok) {
          backupData = await res.json();
        }
      } catch (e) {
        console.warn('Could not fetch server backup, assembling client state:', e);
      }

      if (!backupData) {
        backupData = {
          version: '1.0.0',
          appName: 'Assados do Jeferson',
          exportedAt: new Date().toISOString(),
          timestamp: Date.now(),
          products,
          deliveryTaxes,
          orders,
          config
        };
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `backup-assados-jeferson-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToggleFeedback('Arquivo de backup (.JSON) gerado e baixado com sucesso!');
      setTimeout(() => setToggleFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error exporting backup:', err);
      setToggleFeedback('Erro ao exportar arquivo de backup.');
      setTimeout(() => setToggleFeedback(null), 4000);
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoringBackup(true);
    setRestoreMessage(null);

    try {
      const fileText = await file.text();
      const backupJson = JSON.parse(fileText);

      // Validate json
      if (!backupJson || typeof backupJson !== 'object') {
        throw new Error('Arquivo JSON inválido.');
      }

      const res = await fetch('/api/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupJson)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao restaurar backup no servidor.');
      }

      const data = await res.json();
      setRestoreMessage({
        type: 'success',
        text: `Backup restaurado com sucesso! (${data.counts?.products ?? 'Vários'} produtos, ${data.counts?.taxes ?? 'Várias'} taxas de bairros, ${data.counts?.orders ?? 'Vários'} pedidos).`
      });

      onRefresh();
    } catch (err: any) {
      console.error('Error restoring backup:', err);
      setRestoreMessage({
        type: 'error',
        text: err.message || 'Erro ao processar o arquivo de backup.'
      });
    } finally {
      setIsRestoringBackup(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenProdModal = (p?: Product) => {
    if (p) {
      setEditingProd(p);
      setProdNome(p.nome);
      setProdCategoria(p.categoria);
      setProdPreco(p.preco.toString().replace('.', ','));
      const cleanUnidade = p.unidade?.toLowerCase().includes('kg') ? 'kg' : 'un';
      setProdUnidade(p.unidade || cleanUnidade);
      setProdDescricao(p.descricao || '');
      setProdAtivo(p.ativo !== false);
    } else {
      setEditingProd(null);
      setProdNome('');
      setProdCategoria('Carne');
      setProdPreco('');
      setProdUnidade('kg');
      setProdDescricao('');
      setProdAtivo(true);
    }
    setIsProdModalOpen(true);
  };

  const handleToggleProductActive = async (p: Product) => {
    const nextState = p.ativo === false ? true : false;
    try {
      await onUpdateProduct(p.id, { ativo: nextState });
      setToggleFeedback(`Produto "${p.nome}" ${nextState ? 'ativado com sucesso!' : 'inativado (pausado)!'}`);
      setTimeout(() => setToggleFeedback(null), 2500);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTaxActive = async (t: DeliveryTax) => {
    const nextState = t.ativo === false ? true : false;
    try {
      await onUpdateDeliveryTax(t.id, { ativo: nextState });
      setToggleFeedback(`Bairro "${t.bairro}" ${nextState ? 'ativado!' : 'inativado!'}`);
      setTimeout(() => setToggleFeedback(null), 2500);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const prodName = deletingProduct.nome;
      await onDeleteProduct(deletingProduct.id);
      setDeletingProduct(null);
      if (isProdModalOpen && editingProd?.id === deletingProduct.id) {
        setIsProdModalOpen(false);
      }
      setToggleFeedback(`Produto "${prodName}" excluído da base de dados com sucesso!`);
      setTimeout(() => setToggleFeedback(null), 3000);
      onRefresh();
    } catch (e) {
      console.error('Error deleting product:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteTax = async () => {
    if (!deletingTax) return;
    setIsDeleting(true);
    try {
      const bairroName = deletingTax.bairro;
      await onDeleteDeliveryTax(deletingTax.id);
      setDeletingTax(null);
      if (isTaxModalOpen && editingTax?.id === deletingTax.id) {
        setIsTaxModalOpen(false);
      }
      setToggleFeedback(`Taxa do bairro "${bairroName}" excluída com sucesso!`);
      setTimeout(() => setToggleFeedback(null), 3000);
      onRefresh();
    } catch (e) {
      console.error('Error deleting delivery tax:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = parseFloat(prodPreco.replace(',', '.'));
    if (!prodNome || isNaN(precoNum)) return;

    if (editingProd) {
      await onUpdateProduct(editingProd.id, {
        nome: prodNome,
        categoria: prodCategoria,
        preco: precoNum,
        unidade: prodUnidade,
        descricao: prodDescricao,
        ativo: prodAtivo
      });
    } else {
      await onAddProduct({
        nome: prodNome,
        categoria: prodCategoria,
        preco: precoNum,
        unidade: prodUnidade,
        descricao: prodDescricao,
        ativo: prodAtivo
      });
    }
    setIsProdModalOpen(false);
    onRefresh();
  };

  const handleOpenTaxModal = (t?: DeliveryTax) => {
    if (t) {
      setEditingTax(t);
      setTaxBairro(t.bairro);
      setTaxValor(t.taxa.toString().replace('.', ','));
      setTaxMin(t.tempoMin?.toString() || '20');
      setTaxMax(t.tempoMax?.toString() || '35');
      setTaxAtivo(t.ativo !== false);
    } else {
      setEditingTax(null);
      setTaxBairro('');
      setTaxValor('');
      setTaxMin('20');
      setTaxMax('35');
      setTaxAtivo(true);
    }
    setIsTaxModalOpen(true);
  };

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(taxValor.replace(',', '.'));
    if (!taxBairro || isNaN(valorNum)) return;

    if (editingTax) {
      await onUpdateDeliveryTax(editingTax.id, {
        bairro: taxBairro,
        taxa: valorNum,
        tempoMin: parseInt(taxMin) || 20,
        tempoMax: parseInt(taxMax) || 35,
        ativo: taxAtivo
      });
    } else {
      await onAddDeliveryTax({
        bairro: taxBairro,
        taxa: valorNum,
        tempoMin: parseInt(taxMin) || 20,
        tempoMax: parseInt(taxMax) || 35,
        ativo: taxAtivo
      });
    }
    setIsTaxModalOpen(false);
    onRefresh();
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfigSaving(true);
    try {
      await onUpdateConfig(storeConfigForm);
      setConfigSavedToast(true);
      setTimeout(() => setConfigSavedToast(false), 3000);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsConfigSaving(false);
    }
  };

  const handleDownloadProjectZip = () => {
    setIsDownloadingZip(true);
    window.location.href = '/api/download-zip';
    setTimeout(() => setIsDownloadingZip(false), 3000);
  };

  const activeProductsCount = products.filter(p => p.ativo !== false).length;
  const inactiveProductsCount = products.filter(p => p.ativo === false).length;

  return (
    <div className="space-y-6 font-sans-clean">
      {/* Toast Notification */}
      {toggleFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161622] border border-amber-500/40 text-stone-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{toggleFeedback}</span>
        </div>
      )}

      {/* Sub-nav Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#1c1c28]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'PRODUCTS'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'bg-[#181824] text-stone-400 hover:text-stone-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Cardápio & Produtos ({activeProductsCount} ativos{inactiveProductsCount > 0 ? ` / ${inactiveProductsCount} inativos` : ''})</span>
          </button>

          <button
            onClick={() => setActiveTab('TAXES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'TAXES'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'bg-[#181824] text-stone-400 hover:text-stone-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Taxas de Bairros ({deliveryTaxes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'CONFIG'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'bg-[#181824] text-stone-400 hover:text-stone-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações da Loja & PIX</span>
          </button>

          <button
            onClick={() => setActiveTab('BACKUP')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'BACKUP'
                ? 'bg-blue-500 text-stone-950 shadow-md'
                : 'bg-[#181824] text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>Exportar Backup & Restauração</span>
          </button>

          <button
            onClick={() => setActiveTab('DOWNLOAD')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'DOWNLOAD'
                ? 'bg-emerald-500 text-stone-950 shadow-md'
                : 'bg-[#181824] text-stone-400 hover:text-stone-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Baixar Projeto (.ZIP)</span>
          </button>
        </div>

        {/* Quick 1-Click Export Backup Button in toolbar */}
        <button
          onClick={handleExportBackupJson}
          disabled={isExportingBackup}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
          title="Baixar arquivo JSON completo de backup de produtos, taxas, configurações e pedidos"
        >
          <HardDriveDownload className="w-4 h-4 text-blue-400" />
          <span>{isExportingBackup ? 'Gerando Backup...' : 'Exportar Backup (.JSON)'}</span>
        </button>
      </div>

      {/* Tab: Products */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#20202e]">
            <div>
              <h3 className="font-display font-bold text-lg text-stone-100">
                Cardápio de Carnes & Acompanhamentos
              </h3>
              <p className="text-xs text-stone-400">
                Gerencie itens, preços e ative/inative produtos em tempo real para pedidos Web e WhatsApp
              </p>
            </div>
            <button
              onClick={() => handleOpenProdModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => {
              const isAtivo = p.ativo !== false;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl p-4 space-y-3 transition flex flex-col justify-between border ${
                    isAtivo
                      ? 'bg-[#181824] border-[#242436] hover:border-[#383852]'
                      : 'bg-[#14141e]/70 border-[#241f28] opacity-80'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#252538] text-amber-400">
                          {p.categoria}
                        </span>
                        {isAtivo ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Ativo
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950/70 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            Inativo
                          </span>
                        )}
                      </div>

                      <span className={`font-mono font-extrabold text-sm ${isAtivo ? 'text-emerald-400' : 'text-stone-500'}`}>
                        {formatBRL(p.preco)}{' '}
                        <span className="text-[10px] text-stone-400 font-normal">
                          /{p.unidade?.toLowerCase().includes('kg') ? 'kg' : (p.unidade || 'un')}
                        </span>
                      </span>
                    </div>

                    <h4 className={`font-bold text-sm pt-1 ${isAtivo ? 'text-stone-100' : 'text-stone-400 line-through'}`}>
                      {p.nome}
                    </h4>
                    {p.descricao && (
                      <p className="text-xs text-stone-400 line-clamp-2">{p.descricao}</p>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#232334]">
                    {/* Fast Toggle Action Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleProductActive(p)}
                      title={isAtivo ? 'Inativar item (ocultar de novos pedidos)' : 'Ativar item (disponibilizar no cardápio)'}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        isAtivo
                          ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/30 hover:border-rose-500/60'
                          : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40 hover:border-emerald-500'
                      }`}
                    >
                      {isAtivo ? (
                        <>
                          <Power className="w-3.5 h-3.5 text-rose-400" />
                          <span>Inativar</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ativar Item</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenProdModal(p)}
                        title="Editar detalhes do produto"
                        className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-[#252538] rounded-lg transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingProduct(p)}
                        title="Excluir produto da base de dados"
                        className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Delivery Taxes */}
      {activeTab === 'TAXES' && (
        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#20202e]">
            <div>
              <h3 className="font-display font-bold text-lg text-stone-100">
                Taxas de Entrega por Bairro
              </h3>
              <p className="text-xs text-stone-400">
                Tabela de fretes utilizada pelo cálculo automático do link web e WhatsApp
              </p>
            </div>
            <button
              onClick={() => handleOpenTaxModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Bairro</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveryTaxes.map(t => {
              const isAtivo = t.ativo !== false;
              return (
                <div
                  key={t.id}
                  className={`border rounded-2xl p-4 space-y-3 flex items-center justify-between transition ${
                    isAtivo ? 'bg-[#181824] border-[#242436]' : 'bg-[#14141e]/70 border-[#241f28] opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold text-sm ${isAtivo ? 'text-stone-100' : 'text-stone-400 line-through'}`}>
                        {t.bairro}
                      </h4>
                      {!isAtivo && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-500/30">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 font-mono mt-0.5">
                      Taxa: <strong className="text-emerald-400">{formatBRL(t.taxa)}</strong>
                    </p>
                    <p className="text-[10px] text-stone-500">Tempo: {t.tempoMin || 20}-{t.tempoMax || 35} min</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleTaxActive(t)}
                      title={isAtivo ? 'Inativar bairro' : 'Ativar bairro'}
                      className={`p-1.5 rounded-lg border transition ${
                        isAtivo
                          ? 'bg-rose-950/30 text-rose-400 border-rose-500/30 hover:bg-rose-900/50'
                          : 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/70'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenTaxModal(t)}
                      className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-[#252538] rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTax(t)}
                      title="Excluir taxa deste bairro"
                      className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Store Config */}
      {activeTab === 'CONFIG' && (
        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-6 space-y-6 shadow-xl max-w-2xl">
          <div className="pb-4 border-b border-[#20202e]">
            <h3 className="font-display font-bold text-lg text-stone-100">
              Dados da Loja & Chave PIX
            </h3>
            <p className="text-xs text-stone-400">
              Informações exibidas no cardápio web, QR Code e mensagens do WhatsApp
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Nome da Empresa:</label>
                <input
                  type="text"
                  value={storeConfigForm.empresa}
                  onChange={e => setStoreConfigForm({ ...storeConfigForm, empresa: e.target.value })}
                  className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Telefone / WhatsApp da Loja:</label>
                <input
                  type="text"
                  value={storeConfigForm.telefone}
                  onChange={e => setStoreConfigForm({ ...storeConfigForm, telefone: e.target.value })}
                  className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Chave PIX:</label>
                <input
                  type="text"
                  value={storeConfigForm.chavePix}
                  onChange={e => setStoreConfigForm({ ...storeConfigForm, chavePix: e.target.value })}
                  className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Tipo de Chave PIX:</label>
                <input
                  type="text"
                  value={storeConfigForm.tipoPix}
                  onChange={e => setStoreConfigForm({ ...storeConfigForm, tipoPix: e.target.value })}
                  className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="submit"
                disabled={isConfigSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-950/40"
              >
                <Save className="w-4 h-4" />
                <span>{isConfigSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
              {configSavedToast && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Configurações atualizadas!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab: Backup & Recovery */}
      {activeTab === 'BACKUP' && (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="bg-[#121218] border border-[#222230] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#20202e]">
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl text-stone-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  Backup & Recuperação da Base de Dados
                </h3>
                <p className="text-xs text-stone-400 pt-1">
                  Gere um arquivo JSON com 100% dos dados da loja (cardápio de produtos, taxas de entrega por bairro, pedidos, transações de caixa e dados PIX).
                </p>
              </div>
              <button
                onClick={handleExportBackupJson}
                disabled={isExportingBackup}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-blue-950/50 cursor-pointer disabled:opacity-50"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>{isExportingBackup ? 'Gerando Arquivo...' : 'Exportar Backup (.JSON)'}</span>
              </button>
            </div>

            {/* Status overview cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-[#181824] border border-[#262638] rounded-2xl">
                <span className="text-[11px] font-semibold text-stone-400 block">Itens no Cardápio</span>
                <span className="text-xl font-display font-extrabold text-amber-400">{products.length}</span>
                <span className="text-[10px] text-stone-400 block pt-0.5">{activeProductsCount} ativos</span>
              </div>

              <div className="p-4 bg-[#181824] border border-[#262638] rounded-2xl">
                <span className="text-[11px] font-semibold text-stone-400 block">Bairros Cadastrados</span>
                <span className="text-xl font-display font-extrabold text-blue-400">{deliveryTaxes.length}</span>
                <span className="text-[10px] text-stone-400 block pt-0.5">Taxas de Entrega</span>
              </div>

              <div className="p-4 bg-[#181824] border border-[#262638] rounded-2xl">
                <span className="text-[11px] font-semibold text-stone-400 block">Total de Pedidos</span>
                <span className="text-xl font-display font-extrabold text-emerald-400">{orders.length}</span>
                <span className="text-[10px] text-stone-400 block pt-0.5">Histórico completo</span>
              </div>

              <div className="p-4 bg-[#181824] border border-[#262638] rounded-2xl">
                <span className="text-[11px] font-semibold text-stone-400 block">Configurações & PIX</span>
                <span className="text-sm font-display font-bold text-stone-200 truncate block mt-1">
                  {config.chavePix ? config.tipoPix || 'Configurado' : 'Pendente'}
                </span>
                <span className="text-[10px] text-stone-400 block pt-0.5 truncate">{config.empresa}</span>
              </div>
            </div>

            {/* Actions Grid: Export & Restore */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Export Column */}
              <div className="bg-[#161622] border border-[#28283c] rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-stone-100">1. Baixar Arquivo JSON de Backup</h4>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Clique no botão abaixo para gerar e baixar instantaneamente o arquivo formatado <code className="text-blue-300 font-mono bg-blue-950/40 px-1 py-0.5 rounded">backup-assados-jeferson-[DATA].json</code>. Guarde este arquivo em um local seguro como Google Drive ou pendrive.
                  </p>
                </div>

                <button
                  onClick={handleExportBackupJson}
                  disabled={isExportingBackup}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-950/40 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingBackup ? 'Processando Backup...' : 'Exportar e Baixar Backup (.JSON)'}</span>
                </button>
              </div>

              {/* Restore Column */}
              <div className="bg-[#161622] border border-[#28283c] rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-stone-100">2. Restaurar Dados a partir de Backup</h4>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Selecione um arquivo de backup previamente exportado para recuperar ou migrar todos os produtos, taxas de bairros e configurações.
                  </p>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                    id="backup-file-upload-input"
                  />
                  <label
                    htmlFor="backup-file-upload-input"
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#232334] hover:bg-[#2c2c42] border border-[#3b3b54] text-stone-200 font-bold text-xs rounded-xl transition cursor-pointer ${
                      isRestoringBackup ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 text-emerald-400 ${isRestoringBackup ? 'animate-spin' : ''}`} />
                    <span>{isRestoringBackup ? 'Restaurando Base de Dados...' : 'Selecionar Arquivo de Backup (.JSON)'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Restore Feedback message */}
            {restoreMessage && (
              <div
                className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
                  restoreMessage.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                }`}
              >
                {restoreMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{restoreMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Download ZIP */}
      {activeTab === 'DOWNLOAD' && (
        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-8 shadow-xl text-center max-w-xl mx-auto space-y-5">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-3xl border border-emerald-500/30 flex items-center justify-center mx-auto">
            <FileArchive className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-stone-100">
              Download Completo do Código (.ZIP)
            </h3>
            <p className="text-xs text-stone-400 pt-1">
              Baixe todo o projeto pronto para rodar em qualquer servidor Node.js ou hospedagem.
            </p>
          </div>

          <button
            onClick={handleDownloadProjectZip}
            disabled={isDownloadingZip}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-extrabold text-sm rounded-2xl transition shadow-xl shadow-emerald-950/40"
          >
            <Download className="w-5 h-5" />
            <span>{isDownloadingZip ? 'Compactando e Baixando...' : 'Baixar assados-do-jeferson-projeto.zip'}</span>
          </button>
        </div>
      )}

      {/* Product Modal */}
      {isProdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121218] border border-[#28283a] rounded-3xl shadow-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-stone-100">
              {editingProd ? 'Editar Produto' : 'Novo Produto'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Nome do Produto:</label>
                <input
                  type="text"
                  value={prodNome}
                  onChange={e => setProdNome(e.target.value)}
                  placeholder="Ex: Picanha na Brasa"
                  required
                  className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Categoria:</label>
                  <select
                    value={prodCategoria}
                    onChange={e => {
                      const newCat = e.target.value as ProductCategory;
                      setProdCategoria(newCat);
                      if (newCat === 'Carne' && prodUnidade !== 'kg' && prodUnidade !== 'un') {
                        setProdUnidade('kg');
                      } else if (newCat !== 'Carne' && prodUnidade === 'kg') {
                        setProdUnidade('un');
                      }
                    }}
                    className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none"
                  >
                    <option value="Carne">Carne</option>
                    <option value="Acompanhamento">Acompanhamento</option>
                    <option value="Bebida">Bebida</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">
                    Preço (R$ {prodUnidade === 'kg' ? '/ kg' : '/ un'}):
                  </label>
                  <input
                    type="text"
                    value={prodPreco}
                    onChange={e => setProdPreco(e.target.value)}
                    placeholder="Ex: 75,00"
                    required
                    className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Unit Selection: KG or UN */}
              <div className="space-y-2 p-3 bg-[#0d0d12] border border-[#242436] rounded-2xl">
                <label className="text-xs font-bold text-stone-200 block">
                  Como este item é vendido no cardápio?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProdUnidade('kg')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      prodUnidade === 'kg'
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                        : 'bg-[#161622] text-stone-300 border-[#28283a] hover:bg-[#1f1f2e]'
                    }`}
                  >
                    <span>⚖️ Por Quilo (kg)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProdUnidade('un')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      prodUnidade === 'un'
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                        : 'bg-[#161622] text-stone-300 border-[#28283a] hover:bg-[#1f1f2e]'
                    }`}
                  >
                    <span>📦 Por Unidade (un)</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-400 leading-tight">
                  {prodUnidade === 'kg'
                    ? '• Seleção por peso: o cliente escolhe a quantidade em kg (500g, 1kg, 1.5kg...) e o valor é atualizado na balança.'
                    : '• Seleção por unidade: o cliente escolhe a quantidade de itens (1, 2, 3...) com valor fixo unitário.'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Descrição:</label>
                <textarea
                  value={prodDescricao}
                  onChange={e => setProdDescricao(e.target.value)}
                  rows={2}
                  placeholder="Descrição que aparece para o cliente..."
                  className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>

              {/* Ativo toggle in modal */}
              <div className="flex items-center gap-2 pt-1 pb-1">
                <label className="flex items-center gap-2.5 text-xs text-stone-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prodAtivo}
                    onChange={e => setProdAtivo(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-[#0d0d12] border-[#262638] focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Disponível no Cardápio para Novos Pedidos (Ativo)</span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#20202e]">
                {editingProd ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingProduct(editingProd);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 hover:border-rose-500 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Excluir Item</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProdModalOpen(false)}
                    className="px-4 py-2 bg-[#20202e] text-stone-300 text-xs font-semibold rounded-xl hover:bg-[#28283a] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/40 transition cursor-pointer"
                  >
                    Salvar Produto
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Modal */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121218] border border-[#28283a] rounded-3xl shadow-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-stone-100">
              {editingTax ? 'Editar Bairro' : 'Novo Bairro / Taxa'}
            </h3>
            <form onSubmit={handleSaveTax} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Nome do Bairro:</label>
                <input
                  type="text"
                  value={taxBairro}
                  onChange={e => setTaxBairro(e.target.value)}
                  placeholder="Ex: Zona 08"
                  required
                  className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Taxa de Entrega (R$):</label>
                <input
                  type="text"
                  value={taxValor}
                  onChange={e => setTaxValor(e.target.value)}
                  placeholder="Ex: 8,50"
                  required
                  className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 pb-1">
                <label className="flex items-center gap-2.5 text-xs text-stone-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={taxAtivo}
                    onChange={e => setTaxAtivo(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-[#0d0d12] border-[#262638] focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Bairro Ativo para Entrega</span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#20202e]">
                {editingTax ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingTax(editingTax);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 hover:border-rose-500 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Excluir Bairro</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTaxModalOpen(false)}
                    className="px-4 py-2 bg-[#20202e] text-stone-300 text-xs font-semibold rounded-xl hover:bg-[#28283a] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/40 transition cursor-pointer"
                  >
                    Salvar Bairro
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Product Deletion */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#121218] border border-rose-500/40 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-display font-bold text-base text-stone-100">
                Excluir Item do Cardápio?
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Você está prestes a remover permanentemente o item da base de dados:
              </p>
              <div className="p-3 bg-[#181824] border border-[#27273a] rounded-2xl text-left my-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-100 text-sm">{deletingProduct.nome}</span>
                  <span className="text-emerald-400 font-mono font-bold text-xs">
                    {formatBRL(deletingProduct.preco)} / {deletingProduct.unidade || 'kg'}
                  </span>
                </div>
                <span className="text-[11px] text-amber-400 font-semibold block mt-0.5">
                  Categoria: {deletingProduct.categoria}
                </span>
                {deletingProduct.descricao && (
                  <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                    {deletingProduct.descricao}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-rose-300/90 font-medium">
                ⚠️ O item deixará de aparecer no cardápio web e no simulador para novos pedidos. Pedidos anteriores já registrados não serão afetados.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingProduct(null)}
                className="flex-1 px-4 py-2.5 bg-[#20202e] hover:bg-[#2c2c3e] text-stone-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteProduct}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold rounded-xl transition shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Item'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delivery Tax Deletion */}
      {deletingTax && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#121218] border border-rose-500/40 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-display font-bold text-base text-stone-100">
                Excluir Bairro de Entrega?
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Você está prestes a remover o bairro da lista de taxas de entrega:
              </p>
              <div className="p-3 bg-[#181824] border border-[#27273a] rounded-2xl text-left my-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-100 text-sm">{deletingTax.bairro}</span>
                  <span className="text-emerald-400 font-mono font-bold text-xs">
                    {formatBRL(deletingTax.taxa)}
                  </span>
                </div>
                <span className="text-[11px] text-stone-400 block mt-0.5">
                  Tempo estimado: {deletingTax.tempoMin || 20} a {deletingTax.tempoMax || 35} min
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingTax(null)}
                className="flex-1 px-4 py-2.5 bg-[#20202e] hover:bg-[#2c2c3e] text-stone-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteTax}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold rounded-xl transition shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Bairro'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
