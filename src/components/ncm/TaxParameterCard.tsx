import { AlertTriangle } from 'lucide-react';
import type { NcmTaxAndInterventionDto } from '@/app/actions/ncm';

export function TaxParameterCard({ taxParameters }: { taxParameters: NcmTaxAndInterventionDto['taxParameters'] }) {
  if (!taxParameters) {
    return (
      <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          No hay parámetros tributarios activos para esta posición. El cálculo queda sujeto a revisión PJM; podés
          cargar tasas manualmente mientras tanto.
        </span>
      </div>
    );
  }

  const rows: [string, number][] = [
    ['Derecho de importación (DIE)', taxParameters.importDuty],
    ['Tasa de estadística (TE)', taxParameters.statisticalRate],
    ['Alícuota de IVA', taxParameters.iva],
    ['IVA adicional', taxParameters.ivaAdditional],
    ['Perc. Ganancias', taxParameters.ganancias],
    ['Perc. Ingresos Brutos', taxParameters.iibb],
  ];

  return (
    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-emerald-800 uppercase">Tributos autocompletados</span>
        <span className="text-[10px] text-emerald-700 font-semibold">Fuente: {taxParameters.source || 'catálogo'}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="bg-white rounded-lg p-2 border border-emerald-100">
            <span className="block text-[10px] text-slate-500 font-semibold">{label}</span>
            <span className="font-bold text-slate-800">{value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
