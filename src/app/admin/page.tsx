import Link from 'next/link';
import { requireAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';
import { Badge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/formatMoney';
import { SIMULATION_STATUS_TONE } from '@/lib/constants/statusStyles';
import { SIMULATION_STATUS_LABELS, type SimulationStatus } from '@/types/simulation';

interface RequestRow {
  id: string;
  status: string;
  priority: string;
  created_at: string;
  simulation_id: string;
  simulations: {
    id: string;
    name: string;
    transport_mode: string;
    origin_country: string;
    final_destination: string;
    total_cost: number;
    cash_required: number;
    currency: string;
    status: string;
    profiles: { full_name: string; email: string } | null;
    companies: { business_name: string } | null;
  } | null;
}

export default async function AdminRequestsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from('pjm_requests')
    .select('*, simulations(*, profiles(full_name, email), companies(business_name))')
    .order('created_at', { ascending: false })
    .returns<RequestRow[]>();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Panel PJM</h1>
      <p className="text-sm text-slate-500 mb-6">Solicitudes de cotización formal recibidas de clientes.</p>
      <AdminNav active="/admin" />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Empresa</th>
                <th className="p-3">Simulación</th>
                <th className="p-3">Modalidad</th>
                <th className="p-3">Origen → Destino</th>
                <th className="p-3 text-right">Total estimado</th>
                <th className="p-3 text-right">Caja necesaria</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(requests ?? []).map((req) => {
                const sim = req.simulations;
                if (!sim) return null;
                return (
                  <tr key={req.id} className="hover:bg-slate-50/60">
                    <td className="p-3 text-slate-700">{sim.profiles?.full_name || '—'}</td>
                    <td className="p-3 text-slate-500">{sim.companies?.business_name || '—'}</td>
                    <td className="p-3 font-semibold text-slate-800">
                      <Link href={`/admin/solicitudes/${sim.id}`} className="hover:text-indigo-600">
                        {sim.name}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-500">{sim.transport_mode}</td>
                    <td className="p-3 text-slate-500">
                      {sim.origin_country} → {sim.final_destination}
                    </td>
                    <td className="p-3 text-right">{formatMoney(sim.total_cost, sim.currency)}</td>
                    <td className="p-3 text-right font-bold text-indigo-700">{formatMoney(sim.cash_required, sim.currency)}</td>
                    <td className="p-3">
                      <Badge tone={SIMULATION_STATUS_TONE[sim.status as SimulationStatus] ?? 'slate'}>
                        {SIMULATION_STATUS_LABELS[sim.status as SimulationStatus] ?? sim.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                );
              })}
              {(!requests || requests.length === 0) && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 text-sm">
                    Todavía no hay solicitudes de cotización formal.
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
