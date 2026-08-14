import React, { useState } from 'react';
import { CashRegisterSummary, StoreConfig, Order, CashTransaction, FormaPagamento } from '../types';
import { formatBRL } from '../utils/formatters';
import { exportCashTransactionsToCSV } from '../utils/csvExport';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  QrCode,
  Plus,
  Minus,
  RotateCcw,
  FileText,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Download
} from 'lucide-react';

interface CashRegisterManagerProps {
  summary: CashRegisterSummary | null;
  config: StoreConfig;
  orders: Order[];
  onRefresh: () => void;
  onOpenReceipt: (order: Order) => void;
  onAddTransaction: (tx: Omit<CashTransaction, 'id' | 'dataHora' | 'criadoEm'>) => Promise<void>;
  onReopenOrder?: (orderId: string) => Promise<void>;
}

export const CashRegisterManager: React.FC<CashRegisterManagerProps> = ({
  summary,
  config,
  orders,
  onRefresh,
  onOpenReceipt,
  onAddTransaction,
  onReopenOrder
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [txCategory, setTxCategory] = useState<'VENDA' | 'SUPRIMENTO' | 'SANGRIA' | 'DESPESA' | 'OUTROS'>('DESPESA');
  const [txAmount, setTxAmount] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState<FormaPagamento>('Dinheiro');
  const [txDescription, setTxDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(txAmount.replace(',', '.'));
    if (!val || val <= 0 || !txDescription.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddTransaction({
        tipo: txType,
        categoria: txCategory,
        valor: val,
        formaPagamento: txPaymentMethod,
        descricao: txDescription.trim()
      });
      setIsModalOpen(false);
      setTxAmount('');
      setTxDescription('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSummary = summary || {
    saldoTotal: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    totalPix: 0,
    totalDinheiro: 0,
    totalCartao: 0,
    transacoes: []
  };

  return (
    <div className="space-y-6 font-sans-clean">
      {/* Top Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121218] border border-emerald-500/30 rounded-3xl p-5 space-y-2 shadow-xl shadow-emerald-950/20">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Saldo Total em Caixa</span>
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-display font-extrabold text-emerald-400">
            {formatBRL(currentSummary.saldoTotal)}
          </p>
          <div className="text-[11px] text-stone-400 flex items-center justify-between pt-1 border-t border-[#20202e]">
            <span>Entradas: {formatBRL(currentSummary.totalEntradas)}</span>
            <span className="text-red-400">Saídas: {formatBRL(currentSummary.totalSaidas)}</span>
          </div>
        </div>

        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-5 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Recebido via PIX</span>
            <QrCode className="w-5 h-5 text-teal-400" />
          </div>
          <p className="text-2xl font-display font-extrabold text-teal-400">
            {formatBRL(currentSummary.totalPix)}
          </p>
          <p className="text-[11px] text-stone-500">Chave: {config.chavePix}</p>
        </div>

        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-5 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Dinheiro em Espécie</span>
            <Banknote className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-display font-extrabold text-amber-400">
            {formatBRL(currentSummary.totalDinheiro)}
          </p>
          <p className="text-[11px] text-stone-500">Gaveta de Balcão</p>
        </div>

        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-5 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Cartão Crédito / Débito</span>
            <CreditCard className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-2xl font-display font-extrabold text-cyan-400">
            {formatBRL(currentSummary.totalCartao)}
          </p>
          <p className="text-[11px] text-stone-500">Maquininha de Cartão</p>
        </div>
      </div>

      {/* Action Header & Transaction List */}
      <div className="bg-[#121218] border border-[#222230] rounded-3xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#20202e]">
          <div>
            <h3 className="font-display font-bold text-lg text-stone-100">
              Extrato Financeiro & Movimentações
            </h3>
            <p className="text-xs text-stone-400">
              Vendas automáticas de balcão/web, sangrias, suprimentos e retiradas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCashTransactionsToCSV(currentSummary.transacoes)}
              disabled={!currentSummary.transacoes || currentSummary.transacoes.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1c1c28] hover:bg-[#28283a] text-stone-200 border border-[#2e2e42] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold rounded-xl transition"
              title="Exportar extrato financeiro para CSV / Excel"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => {
                setTxType('SAIDA');
                setTxCategory('SANGRIA');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#20202e] hover:bg-[#2b2b3f] text-stone-300 text-xs font-semibold rounded-xl transition"
            >
              <Minus className="w-4 h-4 text-red-400" />
              <span>Sangria / Retirada</span>
            </button>

            <button
              onClick={() => {
                setTxType('ENTRADA');
                setTxCategory('SUPRIMENTO');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-950 font-bold text-xs rounded-xl transition shadow-md shadow-emerald-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Suprimento / Entrada</span>
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-stone-400 uppercase bg-[#171722] border-y border-[#232333]">
              <tr>
                <th className="py-3 px-4">Hora</th>
                <th className="py-3 px-4">Tipo / Categoria</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2c]">
              {currentSummary.transacoes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500">
                    Nenhuma movimentação registrada no caixa ainda.
                  </td>
                </tr>
              ) : (
                currentSummary.transacoes.map(tx => (
                  <tr key={tx.id} className="hover:bg-[#161622] transition">
                    <td className="py-3 px-4 text-stone-400 font-mono">{tx.dataHora}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.tipo === 'ENTRADA'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {tx.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-200 font-medium">{tx.descricao}</td>
                    <td className="py-3 px-4 text-stone-400">{tx.formaPagamento}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={tx.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'}>
                        {tx.tipo === 'ENTRADA' ? '+' : '-'} {formatBRL(tx.valor)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.pedidoId && (
                        <button
                          onClick={() => {
                            const found = orders.find(o => o.id === tx.pedidoId);
                            if (found) onOpenReceipt(found);
                          }}
                          className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-[#222232] rounded-lg transition"
                          title="Ver Comprovante"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121218] border border-[#28283a] rounded-3xl shadow-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-stone-100">
              Registrar Movimentação Manual
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTxType('ENTRADA')}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    txType === 'ENTRADA'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#181824] text-stone-400'
                  }`}
                >
                  Entrada (Crédito)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('SAIDA')}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    txType === 'SAIDA'
                      ? 'bg-red-600 text-white'
                      : 'bg-[#181824] text-stone-400'
                  }`}
                >
                  Saída (Débito)
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-300 font-semibold">Valor (R$):</label>
                <input
                  type="text"
                  value={txAmount}
                  onChange={e => setTxAmount(e.target.value)}
                  placeholder="Ex: 50,00"
                  required
                  className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-300 font-semibold">Descrição / Motivo:</label>
                <input
                  type="text"
                  value={txDescription}
                  onChange={e => setTxDescription(e.target.value)}
                  placeholder="Ex: Troco inicial para gaveta"
                  required
                  className="w-full bg-[#0d0d12] border border-[#262638] focus:border-amber-500 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#20202e]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#20202e] text-stone-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-500 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Movimentação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
