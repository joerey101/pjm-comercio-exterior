import Link from 'next/link';
import { requireAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminKpiCards } from '@/components/admin/AdminKpiCards';
import { AdminRequestFilters } from '@/components/admin/AdminRequestFilters';
import { PriorityBadge } from '@/components/admin/PriorityBadge';
import { Badge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/formatMoney';
import { PJM_REQUEST_STATUS_LABELS, type PjmRequestStatus, type RequestPriority } from '@/types/documents';

interface RequestRow {
  id: string;
  status: PjmRequestStatus;
  priority: RequestPriority;
  created_at: string;
  last_activity_at: string;
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
    ncm_status: string;
    document_status: string;
    profiles: { full_name: string; email: string } | null;
    companies: { business_name: string } | null;
  } | null;
}

const STATUS_TONE: Record<PjmRequestStatus, 'slate' | 'indigo' | 'amber' | 'rose' | 'emerald' | 'blue'> = {
  received: 'indigo',
  in_review: 'blue',
  missing_documents: 'rose',
  ncm_review: 'amber',
  tax_review: 'amber',
  logistics_review: 'amber',
  waiting_client: 'rose',
  ready_for_quote: 'emerald',
  formal_quote_sent: 'emerald',
  closed: 'slate',
  cancelled: 'slate',
};

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; ncmPending?: string }>;
}) {
  await requireAdmin();
  const supabase = await createClient();
  const filters = await searchParams;

  const { data: allRequests } = await supabase
    .from('pjm_requests')
    .select('*, simulations(*, profiles(full_name, email), companies(business_name))')
    .order('last_activity_at', { ascending: false })
    .returns<RequestRow[]>();

  const statusCounts = (allRequests ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  let requests = allRequests ?? [];
  if (filters.status) requests = requests.filter((r) => r.status === filters.status);
  if (filters.priority) requests = requests.filter((r) => r.priority === filters.priority);
  if (filters.ncmPending === '1') requests = requests.filter((r) => r.simulations?.ncm_status === 'pendiente_validacion' || r.simulations?.ncm_status === 'propuesto_cliente');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Panel PJM</h1>
      <p className="text-sm text-slate-500 mb-6">Solicitudes de cotización formal recibidas de clientes.</p>
      <AdminNav active="/admin" />

      <AdminKpiCards statusCounts={statusCounts} />
      <AdminRequestFilters />

      {requests.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center text-slate-400 text-sm">
          No hay solicitudes que coincidan con los filtros.
        </div>
      )}

      {requests.length > 0 && (
        <>
          {/* Mobile: stacked cards so estado / caja necesaria are always visible without horizontal scroll */}
          <div className="grid gap-3 md:hidden">
            {requests.map((req) => {
              const sim = req.simulations;
              if (!sim) return null;
              return (
                <Link
                  key={req.id}
                  href={`/admin/solicitudes/${sim.id}`}
                  className="block bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-800 text-sm">{sim.name}</span>
                    <Badge tone={STATUS_TONE[req.status] ?? 'slate'}>{PJM_REQUEST_STATUS_LABELS[req.status] ?? req.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">
                    {sim.profiles?.full_name || '—'} · {sim.companies?.business_name || 'Sin empresa'}
                  </p>
                  <p className="text-xs text-slate-500 mb-3">
                    {sim.origin_country} → {sim.final_destination} · {sim.transport_mode} ·{' '}
                    {new Date(req.created_at).toLocaleDateString('es-AR')}
                  </p>
                  <div className="flex items-end justify-between border-t border-slate-100 pt-3">
                    <PriorityBadge priority={req.priority} />
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Caja necesaria</span>
                      <span className="text-sm font-black text-indigo-700">{formatMoney(sim.cash_required, sim.currency)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop / tablet: full table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Empresa</th>
                    <th className="p-3">Simulación</th>
                    <th className="p-3">Modalidad</th>
                    <th className="p-3 text-right">Caja necesaria</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Prioridad</th>
                    <th className="p-3">Últ. actividad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req) => {
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
                        <td className="p-3 text-right font-bold text-indigo-700">{formatMoney(sim.cash_required, sim.currency)}</td>
                        <td className="p-3">
                          <Badge tone={STATUS_TONE[req.status] ?? 'slate'}>{PJM_REQUEST_STATUS_LABELS[req.status] ?? req.status}</Badge>
                        </td>
                        <td className="p-3">
                          <PriorityBadge priority={req.priority} />
                        </td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {new Date(req.last_activity_at).toLocaleDateString('es-AR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
