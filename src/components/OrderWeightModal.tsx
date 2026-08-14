import React, { useState } from 'react';
import { Order, OrderItemMeat } from '../types';
import { formatBRL } from '../utils/formatters';
import { Scale, Check, X, AlertCircle } from 'lucide-react';

interface OrderWeightModalProps {
  order: Order;
  onClose: () => void;
  onSaveWeights: (orderId: string, updatedMeats: OrderItemMeat[], newSubtotal: number, newTotal: number) => void;
}

export const OrderWeightModal: React.FC<OrderWeightModalProps> = ({
  order,
  onClose,
  onSaveWeights
}) => {
  const [meatsState, setMeatsState] = useState<Array<{
    produto: string;
    pesoEstimado: string;
    pesoEstimadoKg: number;
    precoKg: number;
    pesoRealInput: string;
    subtotalReal: number;
  }>>(() => {
    return order.carnes.map(c => ({
      produto: c.produto,
      pesoEstimado: c.peso,
      pesoEstimadoKg: c.pesoKg,
      precoKg: c.precoKg,
      pesoRealInput: c.pesoRealKg ? c.pesoRealKg.toString().replace('.', ',') : (c.pesoKg ? c.pesoKg.toString().replace('.', ',') : ''),
      subtotalReal: c.subtotalReal || c.subtotal
    }));
  });

  const handleWeightChange = (index: number, val: string) => {
    const cleanVal = val.replace(',', '.');
    const num = parseFloat(cleanVal) || 0;

    setMeatsState(prev => {
      const copy = [...prev];
      const precoKg = copy[index].precoKg;
      copy[index] = {
        ...copy[index],
        pesoRealInput: val,
        subtotalReal: num * precoKg
      };
      return copy;
    });
  };

  const handleSave = () => {
    const updatedMeats: OrderItemMeat[] = order.carnes.map((c, i) => {
      const stateItem = meatsState[i];
      const parsedKg = parseFloat(stateItem.pesoRealInput.replace(',', '.')) || c.pesoKg;
      const subReal = parsedKg * c.precoKg;
      return {
        ...c,
        pesoRealKg: parsedKg,
        subtotalReal: subReal
      };
    });

    const sumMeatsReal = updatedMeats.reduce((sum, item) => sum + (item.subtotalReal || item.subtotal), 0);
    const sumAcomp = order.acompanhamentos.reduce((sum, item) => sum + item.subtotal, 0);
    const sumDrinks = order.bebidas.reduce((sum, item) => sum + item.subtotal, 0);

    const newSubtotal = sumMeatsReal + sumAcomp + sumDrinks;
    const newTotal = newSubtotal + order.taxaEntrega;

    onSaveWeights(order.id, updatedMeats, newSubtotal, newTotal);
    onClose();
  };

  const currentTotalCarnes = meatsState.reduce((acc, m) => acc + m.subtotalReal, 0);
  const currentSubtotal = currentTotalCarnes + order.acompanhamentos.reduce((s, a) => s + a.subtotal, 0) + order.bebidas.reduce((s, b) => s + b.subtotal, 0);
  const currentTotal = currentSubtotal + order.taxaEntrega;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[#121218] border border-[#29293d] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#20202e] bg-[#171724] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-stone-100">
                Ajuste de Pesagem Real • {order.numeroPedido}
              </h3>
              <p className="text-xs text-stone-400">
                {order.clienteNome} • {order.tipoRecebimento}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-[#232333] rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              Insira o peso exato medido na balança para cada carne. O valor final do pedido será recalculado instantaneamente.
            </p>
          </div>

          <div className="space-y-3">
            {meatsState.map((meat, idx) => (
              <div
                key={idx}
                className="bg-[#181824] border border-[#29293d] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-stone-100">{meat.produto}</h4>
                    <p className="text-xs text-stone-400">
                      Preço: <strong className="text-amber-400">{formatBRL(meat.precoKg)}/kg</strong> • Estimado: {meat.pesoEstimado}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-400">Subtotal Carne</span>
                    <p className="font-mono font-bold text-sm text-emerald-400">
                      {formatBRL(meat.subtotalReal)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1 border-t border-[#222233]">
                  <label className="text-xs font-semibold text-stone-300 shrink-0">
                    Peso Real Balança (kg):
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={meat.pesoRealInput}
                      onChange={e => handleWeightChange(idx, e.target.value)}
                      placeholder="Ex: 1,420"
                      className="w-full bg-[#0c0c12] border border-[#33334d] focus:border-amber-500 rounded-xl px-3 py-2 text-sm font-mono text-stone-100 outline-none transition"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-stone-500 font-mono">
                      KG
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recalculation Summary */}
          <div className="bg-[#181824] border border-[#222233] rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>Subtotal Carnes (com peso real):</span>
              <span className="font-mono">{formatBRL(currentTotalCarnes)}</span>
            </div>
            {order.taxaEntrega > 0 && (
              <div className="flex justify-between text-stone-400">
                <span>Taxa de Entrega:</span>
                <span className="font-mono">{formatBRL(order.taxaEntrega)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-stone-100 pt-2 border-t border-[#222233]">
              <span>Novo Total do Pedido:</span>
              <span className="font-mono text-emerald-400 text-base">{formatBRL(currentTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#20202e] bg-[#171724] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-[#232333] hover:bg-[#2d2d42] text-stone-300 text-xs font-semibold rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl transition shadow-lg shadow-amber-950/40"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Pesagem & Atualizar Pedido</span>
          </button>
        </div>
      </div>
    </div>
  );
};
