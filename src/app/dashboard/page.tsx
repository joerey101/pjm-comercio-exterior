import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUser, getCurrentProfile } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { SIMULATION_STATUS_TONE } from '@/lib/constants/statusStyles';
import { SIMULATION_STATUS_LABELS } from '@/types/simulation';
import type { SimulationRow } from '@/types/database';
import type { SimulationStatus } from '@/types/simulation';

const TRANSPORT_LABEL: Record<string, string> = {
  ocean_fcl: 'Marítimo FCL',
  ocean_lcl: 'Marítimo LCL',
  air: 'Aéreo',
  road: 'Terrestre',
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: simulations } = await supabase
    .from('simulations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<SimulationRow[]>();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Hola, {profile?.full_name || 'importador'} 👋</h1>
          <p className="text-sm text-slate-500 mt-1">Este es el estado de tus simulaciones de importación.</p>
        </div>
        <Link
          href="/simulaciones/nueva"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva simulación
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Producto / Simulación</th>
                <th className="p-3">Origen</th>
                <th className="p-3">Destino</th>
                <th className="p-3">Modalidad</th>
                <th className="p-3">Incoterm</th>
                <th className="p-3 text-right">Costo total est.</th>
                <th className="p-3 text-right">Caja necesaria</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(simulations ?? []).map((sim) => (
                <tr key={sim.id} className="hover:bg-slate-50/60">
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {new Date(sim.created_at).toLocaleDateString('es-AR')}
                  </td>
                  <td className="p-3 font-semibold text-slate-800">
                    <Link href={`/simulaciones/${sim.id}`} className="hover:text-indigo-600">
                      {sim.name}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-500">{sim.origin_country || '—'}</td>
                  <td className="p-3 text-slate-500">{sim.final_destination || '—'}</td>
                  <td className="p-3 text-slate-500">{TRANSPORT_LABEL[sim.transport_mode] ?? sim.transport_mode}</td>
                  <td className="p-3">
                    <Badge tone="indigo">{sim.incoterm}</Badge>
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-700">{money(sim.total_cost, sim.currency)}</td>
                  <td className="p-3 text-right font-black text-indigo-700">{money(sim.cash_required, sim.currency)}</td>
                  <td className="p-3">
                    <Badge tone={SIMULATION_STATUS_TONE[sim.status as SimulationStatus] ?? 'slate'}>
                      {SIMULATION_STATUS_LABELS[sim.status as SimulationStatus] ?? sim.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(!simulations || simulations.length === 0) && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 text-sm">
                    Todavía no tenés simulaciones guardadas. Creá la primera para conocer tu costo nacionalizado
                    estimado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
