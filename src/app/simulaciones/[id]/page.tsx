import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/formatMoney';
import { SIMULATION_STATUS_TONE, NCM_STATUS_TONE, DOCUMENT_STATUS_RISK, RISK_SEMAPHORE_CLASSES, RISK_SEMAPHORE_LABEL } from '@/lib/constants/statusStyles';
import { SIMULATION_STATUS_LABELS } from '@/types/simulation';
import { NCM_STATUS_LABELS } from '@/types/ncm';
import type { SimulationRow, SimulationItemRow } from '@/types/database';
import type { SimulationStatus, DocumentStatus } from '@/types/simulation';
import type { NCMStatus } from '@/types/ncm';
import { RequestFormalQuoteButton } from '@/components/simulation/RequestFormalQuoteButton';

export default async function SimulationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: simulation } = await supabase
    .from('simulations')
    .select('*')
    .eq('id', id)
    .maybeSingle<SimulationRow>();

  if (!simulation || simulation.user_id !== user.id) notFound();

  const { data: items } = await supabase
    .from('simulation_items')
    .select('*')
    .eq('simulation_id', id)
    .returns<SimulationItemRow[]>();

  const logisticsCostOverFob = simulation.fob_value > 0 ? ((simulation.freight + simulation.local_costs) / simulation.fob_value) * 100 : 0;
  const taxesOverCif =
    simulation.cif_value > 0
      ? ((simulation.customs_duty + simulation.statistical_rate + simulation.fiscal_credits) / simulation.cif_value) * 100
      : 0;

  const risk = DOCUMENT_STATUS_RISK[simulation.document_status as DocumentStatus] ?? 'rojo';
  const canRequestQuote = simulation.status === 'draft' || simulation.status === 'completed';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 w-full">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-6 no-print">
        <ArrowLeft className="w-4 h-4" />
        Volver al dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{simulation.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {simulation.origin_country} → {simulation.final_destination || simulation.destination_port} ·{' '}
            {simulation.incoterm} · Creada el {new Date(simulation.created_at).toLocaleDateString('es-AR')}
          </p>
        </div>
        <Badge tone={SIMULATION_STATUS_TONE[simulation.status as SimulationStatus] ?? 'slate'}>
          {SIMULATION_STATUS_LABELS[simulation.status as SimulationStatus] ?? simulation.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <ResultCard label="Valor FOB" value={formatMoney(simulation.fob_value, simulation.currency)} />
        <ResultCard label="Valor CIF estimado" value={formatMoney(simulation.cif_value, simulation.currency)} />
        <ResultCard label="Costo económico definitivo" value={formatMoney(simulation.definitive_cost, simulation.currency)} />
        <ResultCard label="Créditos fiscales estimados" value={formatMoney(simulation.fiscal_credits, simulation.currency)} />
        <ResultCard
          label="Caja necesaria para liberar"
          value={formatMoney(simulation.cash_required, simulation.currency)}
          highlight
        />
        <ResultCard label="Costo unitario" value={formatMoney(simulation.unit_cost, simulation.currency)} />
        <ResultCard label="Costo logístico / FOB" value={`${logisticsCostOverFob.toFixed(1)}%`} />
        <ResultCard label="Tributos / CIF" value={`${taxesOverCif.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${RISK_SEMAPHORE_CLASSES[risk]}`} />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Riesgo documental</span>
            <span className="text-sm font-bold text-slate-700">{RISK_SEMAPHORE_LABEL[risk]}</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <Badge tone={NCM_STATUS_TONE[simulation.ncm_status as NCMStatus] ?? 'slate'}>
            {NCM_STATUS_LABELS[simulation.ncm_status as NCMStatus] ?? simulation.ncm_status}
          </Badge>
          <span className="text-xs text-slate-500">Estado de la posición arancelaria (NCM)</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Mercadería</h2>
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
              {(items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-3 font-medium text-slate-700">{item.description}</td>
                  <td className="py-2 pr-3 text-slate-500">{item.ncm_code || '—'}</td>
                  <td className="py-2 pr-3 text-right">{item.quantity}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(item.unit_value, simulation.currency)}</td>
                  <td className="py-2 pr-3 text-right font-semibold">{formatMoney(item.total_value, simulation.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-xs sm:text-sm text-amber-800">
        Los cálculos expuestos son estimativos y no constituyen cotización formal ni asesoramiento aduanero
        definitivo. La posición arancelaria, tributos, intervenciones, gastos logísticos, tipo de cambio y
        condiciones de pago deben ser validados por PJM Comercio Exterior antes de embarcar o contratar la
        operación.
      </div>

      <div className="flex flex-wrap items-center gap-3 no-print">
        <Link
          href={`/simulaciones/${simulation.id}/pdf`}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar PDF preliminar
        </Link>
        {canRequestQuote && <RequestFormalQuoteButton simulationId={simulation.id} />}
        {!canRequestQuote && (
          <span className="text-xs text-slate-500">
            Esta simulación ya fue enviada a PJM. Seguí su estado desde el dashboard.
          </span>
        )}
      </div>
    </div>
  );
}

function ResultCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${highlight ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'}`}>
      <span className={`text-[10px] font-bold uppercase block ${highlight ? 'text-indigo-200' : 'text-slate-400'}`}>
        {label}
      </span>
      <span className={`text-lg font-black block mt-1 ${highlight ? 'text-white' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}
