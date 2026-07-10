import { requireAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';
import type { CompanyRow } from '@/types/database';

export default async function AdminCompaniesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<CompanyRow[]>();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 w-full">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Panel PJM</h1>
      <p className="text-sm text-slate-500 mb-6">Empresas registradas por clientes importadores.</p>
      <AdminNav active="/admin/empresas" />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="p-3">Razón social</th>
              <th className="p-3">CUIT</th>
              <th className="p-3">Condición fiscal</th>
              <th className="p-3">Rubro</th>
              <th className="p-3">Modalidad habitual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(companies ?? []).map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-semibold text-slate-800">{c.business_name || '—'}</td>
                <td className="p-3 text-slate-500">{c.cuit || '—'}</td>
                <td className="p-3 text-slate-500">{c.tax_condition || '—'}</td>
                <td className="p-3 text-slate-500">{c.industry || '—'}</td>
                <td className="p-3 text-slate-500">{c.usual_transport_mode || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
