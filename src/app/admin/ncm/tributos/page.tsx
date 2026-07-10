import { requireAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';
import { CatalogVersionList } from '@/components/admin/CatalogVersionList';
import { NcmImportPanel } from '@/components/admin/NcmImportPanel';
import { Badge } from '@/components/ui/Badge';
import type { TaxParameterRow, CatalogVersionRow } from '@/types/database';

export default async function AdminTaxParametersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: params }, { data: versions }] = await Promise.all([
    supabase.from('tax_parameters').select('*').eq('is_active', true).order('normalized_ncm_code').limit(200).returns<TaxParameterRow[]>(),
    supabase.from('tax_parameter_versions').select('*').order('created_at', { ascending: false }).returns<CatalogVersionRow[]>(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Parámetros tributarios</h1>
      <p className="text-sm text-slate-500 mb-6">
        Tasas activas que el motor de cálculo aplica automáticamente cuando el cliente selecciona un NCM del
        catálogo.
      </p>
      <AdminNav active="/admin/ncm/tributos" />

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-3">NCM</th>
                  <th className="p-3 text-right">DIE</th>
                  <th className="p-3 text-right">TE</th>
                  <th className="p-3 text-right">IVA</th>
                  <th className="p-3 text-right">IVA ad.</th>
                  <th className="p-3 text-right">Ganancias</th>
                  <th className="p-3 text-right">IIBB</th>
                  <th className="p-3">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(params ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-mono text-xs font-bold text-slate-700">{p.ncm_code}</td>
                    <td className="p-3 text-right">{p.import_duty}%</td>
                    <td className="p-3 text-right">{p.statistical_rate}%</td>
                    <td className="p-3 text-right">{p.iva}%</td>
                    <td className="p-3 text-right">{p.iva_additional}%</td>
                    <td className="p-3 text-right">{p.ganancias}%</td>
                    <td className="p-3 text-right">{p.iibb}%</td>
                    <td className="p-3">
                      <Badge tone="blue">{p.source ?? 'manual'}</Badge>
                    </td>
                  </tr>
                ))}
                {(!params || params.length === 0) && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 text-sm">
                      No hay parámetros activos todavía. Importá un archivo abajo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <NcmImportPanel jobType="tax_parameters" title="Importar parámetros tributarios" />
      </div>

      <h2 className="text-sm font-bold text-slate-900 uppercase mb-3">Versiones de parámetros</h2>
      <CatalogVersionList jobType="tax_parameters" versions={versions ?? []} />
    </div>
  );
}
