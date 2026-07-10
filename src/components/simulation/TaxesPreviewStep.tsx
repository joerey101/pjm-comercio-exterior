'use client';

import type { SimulationCalculationResult } from '@/lib/calculations/importCostCalculator';
import { Card } from '@/components/ui/Card';

function money(value: number, currency: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value || 0);
}

export function TaxesPreviewStep({
  summary,
  fobValue,
  currency,
}: {
  summary: SimulationCalculationResult;
  fobValue: number;
  currency: string;
}) {
  const rows: [string, number][] = [
    ['Valor FOB', fobValue],
    ['Flete internacional', summary.freight],
    ['Seguro', summary.insurance],
    ['Valor CIF', summary.cif],
    ['Derecho de importación (DIE)', summary.customsDuty],
    ['Tasa estadística', summary.statisticalRate],
    ['Base imponible IVA', summary.vatBase],
  ];

  const credits: [string, number][] = [
    ['IVA', summary.iva],
    ['IVA adicional', summary.ivaAdditional],
    ['Percepción Ganancias', summary.ganancias],
    ['Percepción IIBB', summary.iibb],
  ];

  return (
    <Card step={7} title="Tributos y caja necesaria">
      <p className="text-xs text-slate-500 mb-5">
        Vista previa calculada con los datos cargados hasta ahora. El desglose completo, con semáforos y
        advertencias, se muestra en la pantalla de resultado luego de guardar.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase border-b pb-1 mb-3">Valor aduanero y tributos definitivos</h3>
          <div className="space-y-1.5 text-sm">
            {rows.map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-semibold text-slate-800">{money(val, currency)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase border-b pb-1 mb-3">Créditos fiscales / anticipos</h3>
          <div className="space-y-1.5 text-sm">
            {credits.map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-semibold text-slate-800">{money(val, currency)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold">
              <span className="text-slate-700">Total créditos fiscales</span>
              <span className="text-slate-900">{money(summary.fiscalCredits, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Costo económico definitivo</span>
          <span className="text-lg font-extrabold text-slate-800">{money(summary.definitiveCost, currency)}</span>
        </div>
        <div className="bg-indigo-600 rounded-xl p-4 text-white">
          <span className="text-[10px] font-bold text-indigo-200 uppercase block">Caja necesaria para liberar</span>
          <span className="text-lg font-black">{money(summary.cashRequired, currency)}</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Costo unitario</span>
          <span className="text-lg font-extrabold text-slate-800">{money(summary.unitCost, currency)}</span>
        </div>
      </div>
    </Card>
  );
}
