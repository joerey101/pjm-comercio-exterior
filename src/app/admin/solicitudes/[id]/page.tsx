import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/formatMoney';
import { StatusControls } from '@/components/admin/StatusControls';
import { CommentForm } from '@/components/admin/CommentForm';
import { NcmValidationCard } from '@/components/admin/NcmValidationCard';
import { NCM_STATUS_TONE } from '@/lib/constants/statusStyles';
import { NCM_STATUS_LABELS, type NCMStatus } from '@/types/ncm';
import type { SimulationStatus, DocumentStatus } from '@/types/simulation';
import type { SimulationRow, SimulationItemRow, ProfileRow, CompanyRow, PjmRequestRow, CommentRow } from '@/types/database';

export default async function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: simulation } = await supabase.from('simulations').select('*').eq('id', id).maybeSingle<SimulationRow>();
  if (!simulation) notFound();

  const [{ data: items }, { data: profile }, { data: company }, { data: request }] = await Promise.all([
    supabase.from('simulation_items').select('*').eq('simulation_id', id).returns<SimulationItemRow[]>(),
    supabase.from('profiles').select('*').eq('id', simulation.user_id).maybeSingle<ProfileRow>(),
    simulation.company_id
      ? supabase.from('companies').select('*').eq('id', simulation.company_id).maybeSingle<CompanyRow>()
      : Promise.resolve({ data: null }),
    supabase.from('pjm_requests').select('*').eq('simulation_id', id).maybeSingle<PjmRequestRow>(),
  ]);

  const { data: comments } = request
    ? await supabase
        .from('comments')
        .select('*')
        .eq('request_id', request.id)
        .order('created_at', { ascending: false })
        .returns<CommentRow[]>()
    : { data: [] as CommentRow[] };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 w-full">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Volver a solicitudes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{simulation.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {profile?.full_name} ({profile?.email}) · {company?.business_name || 'Sin empresa cargada'}
          </p>
        </div>
        <Badge tone={NCM_STATUS_TONE[simulation.ncm_status as NCMStatus] ?? 'slate'}>
          {NCM_STATUS_LABELS[simulation.ncm_status as NCMStatus] ?? simulation.ncm_status}
        </Badge>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase mb-4">Gestión de estados</h2>
        <StatusControls
          simulationId={simulation.id}
          status={simulation.status as SimulationStatus}
          ncmStatus={simulation.ncm_status as NCMStatus}
          documentStatus={simulation.document_status as DocumentStatus}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryStat label="FOB" value={formatMoney(simulation.fob_value, simulation.currency)} />
        <SummaryStat label="CIF" value={formatMoney(simulation.cif_value, simulation.currency)} />
        <SummaryStat label="Créditos fiscales" value={formatMoney(simulation.fiscal_credits, simulation.currency)} />
        <SummaryStat label="Caja necesaria" value={formatMoney(simulation.cash_required, simulation.currency)} highlight />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase mb-4">Mercadería</h2>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="py-2 pr-3">Descripción</th>
                <th className="py-2 pr-3">Descripción técnica</th>
                <th className="py-2 pr-3 text-right">Cantidad</th>
                <th className="py-2 pr-3 text-right">Valor total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-3 font-medium text-slate-700">{item.description}</td>
                  <td className="py-2 pr-3 text-slate-500">{item.technical_description || '—'}</td>
                  <td className="py-2 pr-3 text-right">{item.quantity}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(item.total_value, simulation.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-xs font-bold text-slate-900 uppercase mb-3">Validación NCM por ítem</h3>
        <div className="space-y-3">
          {(items ?? []).map((item) => (
            <NcmValidationCard
              key={item.id}
              simulationId={simulation.id}
              itemId={item.id}
              description={item.description}
              ncmCode={item.ncm_code}
              ncmDescription={item.ncm_description}
              ncmStatus={item.ncm_status as NCMStatus}
              ncmSource={item.ncm_source}
            />
          ))}
          {(!items || items.length === 0) && <p className="text-xs text-slate-400">Sin ítems cargados.</p>}
        </div>
      </div>

      {request && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase mb-4">Comentarios internos</h2>
          <CommentForm requestId={request.id} />
          <div className="mt-5 space-y-3">
            {(comments ?? []).map((c) => (
              <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                <p className="text-slate-700">{c.comment}</p>
                <span className="text-[10px] text-slate-400 uppercase font-bold">
                  {new Date(c.created_at).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
            {(!comments || comments.length === 0) && (
              <p className="text-xs text-slate-400">Sin comentarios internos todavía.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'}`}>
      <span className={`text-[10px] font-bold uppercase block ${highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{label}</span>
      <span className={`text-lg font-black block mt-1 ${highlight ? 'text-white' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}
