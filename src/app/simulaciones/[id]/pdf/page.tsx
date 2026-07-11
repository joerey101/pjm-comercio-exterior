import { notFound } from 'next/navigation';
import { Globe2 } from 'lucide-react';
import { requireUser, getCurrentProfile } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/formatMoney';
import { NCM_STATUS_LABELS } from '@/types/ncm';
import { SIMULATION_STATUS_LABELS } from '@/types/simulation';
import type { SimulationRow, SimulationItemRow, CompanyRow } from '@/types/database';
import type { NCMStatus } from '@/types/ncm';
import type { SimulationStatus } from '@/types/simulation';
import { PrintButton } from './PrintButton';

export default async function SimulationPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: simulation } = await supabase.from('simulations').select('*').eq('id', id).maybeSingle<SimulationRow>();
  if (!simulation || simulation.user_id !== user.id) notFound();

  const { data: items } = await supabase
    .from('simulation_items')
    .select('*')
    .eq('simulation_id', id)
    .returns<SimulationItemRow[]>();

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<CompanyRow>();

  const row = (label: string, value: string) => (
    <div className="flex justify-between py-1 text-sm border-b border-slate-100">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 w-full print-full-width">
      <div className="flex justify-end mb-6 no-print">
        <PrintButton />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg block leading-none">PJM Comercio Exterior</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Cotizador Inteligente de Importación Argentina</span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              Simulación N° <span className="font-mono">{simulation.id.slice(0, 8).toUpperCase()}</span>
            </p>
            <p>Fecha: {new Date().toLocaleDateString('es-AR')}</p>
            <p>Vigencia: 7 días corridos desde la fecha de emisión</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Datos del cliente</h3>
            {row('Nombre', profile?.full_name || '—')}
            {row('Email', profile?.email || '—')}
            {row('Teléfono', profile?.phone || '—')}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Datos de la empresa</h3>
            {row('Razón social', company?.business_name || '—')}
            {row('CUIT', company?.cuit || '—')}
            {row('Domicilio', company?.address || '—')}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Datos de la operación</h3>
          <div className="grid grid-cols-2 gap-x-8">
            {row('Incoterm', simulation.incoterm)}
            {row('Origen', simulation.origin_country)}
            {row('Destino final', simulation.final_destination || simulation.destination_port)}
            {row('Estado', SIMULATION_STATUS_LABELS[simulation.status as SimulationStatus] ?? simulation.status)}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Mercadería</h3>
          <table className="w-full text-xs">
            <thead className="text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="text-left py-1">Descripción</th>
                <th className="text-left py-1">NCM propuesto</th>
                <th className="text-right py-1">Cant.</th>
                <th className="text-right py-1">Valor FOB</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item) => {
                return (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-1.5">{item.description}</td>
                    <td className="py-1.5">
                      {item.ncm_code || 'No informado'} ·{' '}
                      {NCM_STATUS_LABELS[item.ncm_status as NCMStatus] ?? item.ncm_status}
                    </td>
                    <td className="py-1.5 text-right">{item.quantity}</td>
                    <td className="py-1.5 text-right">{formatMoney(item.total_value, simulation.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-x-8">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Costo económico</h3>
            {row('Valor FOB', formatMoney(simulation.fob_value, simulation.currency))}
            {row('Flete internacional', formatMoney(simulation.freight, simulation.currency))}
            {row('Seguro', formatMoney(simulation.insurance, simulation.currency))}
            {row('Valor CIF', formatMoney(simulation.cif_value, simulation.currency))}
            {row('Derecho de importación', formatMoney(simulation.customs_duty, simulation.currency))}
            {row('Tasa estadística', formatMoney(simulation.statistical_rate, simulation.currency))}
            {row('Gastos locales', formatMoney(simulation.local_costs, simulation.currency))}
            {row('Costo económico definitivo', formatMoney(simulation.definitive_cost, simulation.currency))}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Créditos fiscales</h3>
            {row('IVA', formatMoney(simulation.iva, simulation.currency))}
            {row('IVA adicional', formatMoney(simulation.iva_additional, simulation.currency))}
            {row('Percepción Ganancias', formatMoney(simulation.ganancias, simulation.currency))}
            {row('Percepción IIBB', formatMoney(simulation.iibb, simulation.currency))}
            {row('Total créditos fiscales', formatMoney(simulation.fiscal_credits, simulation.currency))}
            <div className="mt-4 bg-indigo-600 text-white rounded-xl p-4 flex justify-between items-center">
              <span className="text-xs font-bold uppercase">Caja necesaria para liberar</span>
              <span className="text-lg font-black">{formatMoney(simulation.cash_required, simulation.currency)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-slate-500">Costo unitario</span>
              <span className="font-bold text-slate-800">{formatMoney(simulation.unit_cost, simulation.currency)}</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 space-y-2 border-t border-slate-200 pt-4">
          <p>
            <strong>Supuestos:</strong> tipo de cambio de referencia {simulation.exchange_rate} ({simulation.currency}),
            tarifas de flete y gastos locales estimadas a la fecha de emisión, posición arancelaria sujeta a
            validación.
          </p>
          <p>
            <strong>Exclusiones:</strong> este documento no incluye financiamiento, diferencias de tipo de cambio al
            momento del pago, demoras, ni gastos no informados por el cliente al momento de la simulación.
          </p>
          <p className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
            Los cálculos expuestos son estimativos y no constituyen cotización formal ni asesoramiento aduanero
            definitivo. La posición arancelaria, tributos, intervenciones, gastos logísticos, tipo de cambio y
            condiciones de pago deben ser validados por PJM Comercio Exterior antes de embarcar o contratar la
            operación.
          </p>
        </div>

        <div className="text-center pt-2">
          <p className="text-sm font-bold text-slate-800">
            ¿Querés avanzar? Solicitá tu cotización formal a PJM Comercio Exterior desde el detalle de esta
            simulación.
          </p>
        </div>
      </div>
    </div>
  );
}
