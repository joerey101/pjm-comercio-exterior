'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import type { SimulationItemRow } from '@/types/database';
import type { SimulationItemBreakdown } from '@/lib/calculations/importCostCalculator';

interface Props {
  items: SimulationItemRow[];
  breakdown?: SimulationItemBreakdown[];
  currency: string;
}

export function ItemBreakdownTable({ items, breakdown, currency }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="py-2 pr-3">Descripción</th>
              <th className="py-2 pr-3">NCM</th>
              <th className="py-2 pr-3 text-right">Cantidad</th>
              <th className="py-2 pr-3 text-right">Valor unitario</th>
              <th className="py-2 pr-3 text-right">Valor total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 pr-3 font-medium text-slate-700">{item.description}</td>
                <td className="py-2 pr-3 text-slate-500">{item.ncm_code || '—'}</td>
                <td className="py-2 pr-3 text-right">{item.quantity}</td>
                <td className="py-2 pr-3 text-right">{formatMoney(item.unit_value, currency)}</td>
                <td className="py-2 pr-3 text-right font-semibold">{formatMoney(item.total_value, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
          <tr>
            <th className="py-2 pr-3 w-8"></th>
            <th className="py-2 pr-3">Descripción</th>
            <th className="py-2 pr-3">NCM</th>
            <th className="py-2 pr-3 text-right">Cantidad</th>
            <th className="py-2 pr-3 text-right">Valor total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => {
            const bd = breakdown[idx];
            const isExpanded = expandedId === item.id;
            return (
              <React.Fragment key={item.id}>
                <tr
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <td className="py-3 pr-3 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </td>
                  <td className="py-3 pr-3 font-medium text-slate-700">{item.description}</td>
                  <td className="py-3 pr-3 text-slate-500">{item.ncm_code || '—'}</td>
                  <td className="py-3 pr-3 text-right">{item.quantity}</td>
                  <td className="py-3 pr-3 text-right">{formatMoney(item.total_value, currency)}</td>
                </tr>
                {isExpanded && bd && (
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="p-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">Costos y fletes</h4>
                          <BreakdownRow label="Valor FOB" value={bd.fobValue} currency={currency} />
                          <BreakdownRow label="Flete prorrateado" value={bd.freightProrated} currency={currency} />
                          <BreakdownRow label="Seguro prorrateado" value={bd.insuranceProrated} currency={currency} />
                          <BreakdownRow label="Valor CIF" value={bd.cif} currency={currency} bold />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">Tributos aduaneros</h4>
                          <BreakdownRow label="Derechos (DIE)" value={bd.customsDuty} currency={currency} />
                          <BreakdownRow label="Tasa Estadística" value={bd.statisticalRate} currency={currency} />
                          <BreakdownRow label="Base IVA" value={bd.vatBase} currency={currency} />
                          <BreakdownRow label="IVA (21%)" value={bd.iva} currency={currency} />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">Percepciones</h4>
                          <BreakdownRow label="IVA Adicional" value={bd.ivaAdditional} currency={currency} />
                          <BreakdownRow label="Ganancias" value={bd.ganancias} currency={currency} />
                          <BreakdownRow label="Ingresos Brutos" value={bd.iibb} currency={currency} />
                          <BreakdownRow label="Créditos fiscales" value={bd.fiscalCredits} currency={currency} bold />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BreakdownRow({ label, value, currency, bold }: { label: string; value: number; currency: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? 'font-bold text-slate-900' : 'text-slate-700'}>{formatMoney(value, currency)}</span>
    </div>
  );
}
