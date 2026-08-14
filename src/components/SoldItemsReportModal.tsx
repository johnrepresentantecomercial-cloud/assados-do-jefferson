import React from 'react';
import { Order, OrderStatus } from '../types';
import { formatBRL } from '../utils/formatters';
import { exportOrdersToCSV } from '../utils/csvExport';
import { FileSpreadsheet, X, Flame, Scale, TrendingUp, PackageCheck, Download } from 'lucide-react';

interface SoldItemsReportModalProps {
  orders: Order[];
  onClose: () => void;
}

export const SoldItemsReportModal: React.FC<SoldItemsReportModalProps> = ({
  orders,
  onClose
}) => {
  // Only consider active/valid orders (non-canceled)
  const validOrders = orders.filter(o => o.status !== 'CANCELADO');

  // Aggregated Meats map: name -> { count, totalKg, totalRevenue }
  const meatAgg: Record<string, { count: number; totalKg: number; totalRevenue: number }> = {};
  // Aggregated Sides map: name -> { count, totalRevenue }
  const sideAgg: Record<string, { count: number; totalRevenue: number }> = {};
  // Aggregated Drinks map: name -> { count, totalRevenue }
  const drinkAgg: Record<string, { count: number; totalRevenue: number }> = {};

  let totalGeneralKg = 0;
  let totalMeatsRevenue = 0;
  let totalSidesRevenue = 0;
  let totalDrinksRevenue = 0;

  validOrders.forEach(ord => {
    ord.carnes.forEach(c => {
      const kg = c.pesoRealKg !== undefined ? c.pesoRealKg : (c.pesoKg || 0);
      const sub = c.subtotalReal !== undefined ? c.subtotalReal : c.subtotal;
      totalGeneralKg += kg;
      totalMeatsRevenue += sub;

      if (!meatAgg[c.produto]) {
        meatAgg[c.produto] = { count: 0, totalKg: 0, totalRevenue: 0 };
      }
      meatAgg[c.produto].count += 1;
      meatAgg[c.produto].totalKg += kg;
      meatAgg[c.produto].totalRevenue += sub;
    });

    ord.acompanhamentos.forEach(a => {
      totalSidesRevenue += a.subtotal;
      const key = a.sabor ? `${a.produto} (${a.sabor})` : a.produto;
      if (!sideAgg[key]) {
        sideAgg[key] = { count: 0, totalRevenue: 0 };
      }
      sideAgg[key].count += a.quantidade;
      sideAgg[key].totalRevenue += a.subtotal;
    });

    ord.bebidas.forEach(b => {
      totalDrinksRevenue += b.subtotal;
      if (!drinkAgg[b.produto]) {
        drinkAgg[b.produto] = { count: 0, totalRevenue: 0 };
      }
      drinkAgg[b.produto].count += b.quantidade;
      drinkAgg[b.produto].totalRevenue += b.subtotal;
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#121218] border border-[#28283a] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#20202e] bg-[#161622] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-stone-100">
                Relatório de Carnes & Itens Vendidos
              </h3>
              <p className="text-xs text-stone-400">
                Total consolidado de quilos (KG) e faturamento dos pedidos ativos
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

        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-3 p-5 bg-[#0f0f15] border-b border-[#1f1f2c]">
          <div className="bg-[#181822] border border-[#262638] rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] text-stone-400 font-semibold flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Total de Carnes</span>
            </span>
            <p className="text-lg font-mono font-extrabold text-amber-400">
              {totalGeneralKg.toFixed(2).replace('.', ',')} <span className="text-xs font-sans">kg</span>
            </p>
          </div>

          <div className="bg-[#181822] border border-[#262638] rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] text-stone-400 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Faturamento Carnes</span>
            </span>
            <p className="text-lg font-mono font-extrabold text-emerald-400">
              {formatBRL(totalMeatsRevenue)}
            </p>
          </div>

          <div className="bg-[#181822] border border-[#262638] rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] text-stone-400 font-semibold flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pedidos Considerados</span>
            </span>
            <p className="text-lg font-mono font-extrabold text-cyan-400">
              {validOrders.length}
            </p>
          </div>
        </div>

        {/* Content Lists */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Meats Section */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Flame className="w-4 h-4" />
              <span>Carnes Assadas (Totais em KG)</span>
            </h4>
            <div className="bg-[#161620] border border-[#232332] rounded-2xl overflow-hidden divide-y divide-[#20202e]">
              {Object.keys(meatAgg).length === 0 ? (
                <p className="p-4 text-xs text-stone-500 text-center">Nenhuma carne vendida ainda.</p>
              ) : (
                Object.entries(meatAgg).map(([name, data]) => (
                  <div key={name} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-stone-100">{name}</p>
                      <p className="text-[11px] text-stone-400">
                        {data.count} {data.count === 1 ? 'porção solicitada' : 'porções solicitadas'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-amber-400 text-sm">
                        {data.totalKg.toFixed(3).replace('.', ',')} kg
                      </p>
                      <p className="font-mono text-[11px] text-emerald-400">
                        {formatBRL(data.totalRevenue)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sides Section */}
          {Object.keys(sideAgg).length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Acompanhamentos & Porções
              </h4>
              <div className="bg-[#161620] border border-[#232332] rounded-2xl overflow-hidden divide-y divide-[#20202e]">
                {Object.entries(sideAgg).map(([name, data]) => (
                  <div key={name} className="p-3.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-100">{name}</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-stone-200">{data.count}x unid</span>
                      <p className="font-mono text-[11px] text-emerald-400">{formatBRL(data.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drinks Section */}
          {Object.keys(drinkAgg).length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Bebidas & Refrigerantes
              </h4>
              <div className="bg-[#161620] border border-[#232332] rounded-2xl overflow-hidden divide-y divide-[#20202e]">
                {Object.entries(drinkAgg).map(([name, data]) => (
                  <div key={name} className="p-3.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-100">{name}</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-stone-200">{data.count}x unid</span>
                      <p className="font-mono text-[11px] text-emerald-400">{formatBRL(data.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#20202e] bg-[#161622] flex items-center justify-between">
          <button
            onClick={() => exportOrdersToCSV(validOrders, 'relatorio_pedidos_e_carnes')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs rounded-xl transition shadow-md shadow-emerald-950/40"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Pedidos em CSV ({validOrders.length})</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#252538] hover:bg-[#303046] text-stone-200 text-xs font-semibold rounded-xl transition"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};
