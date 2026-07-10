import { requireAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';
import { CatalogVersionList } from '@/components/admin/CatalogVersionList';
import { NcmImportPanel } from '@/components/admin/NcmImportPanel';
import { Badge } from '@/components/ui/Badge';
import type { NCMPositionRow, CatalogVersionRow } from '@/types/database';

export default async function AdminNcmCatalogPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: positions }, { data: versions }] = await Promise.all([
    supabase.from('ncm_positions').select('*').eq('is_active', true).order('code').limit(200).returns<NCMPositionRow[]>(),
    supabase.from('ncm_catalog_versions').select('*').order('created_at', { ascending: false }).returns<CatalogVersionRow[]>(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Catálogo NCM</h1>
      <p className="text-sm text-slate-500 mb-6">
        Posiciones arancelarias activas usadas por el buscador del wizard. Ninguna posición es una clasificación
        definitiva hasta que un especialista la valida en el detalle de cada solicitud.
      </p>
      <AdminNav active="/admin/ncm" />

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Capítulo</th>
                  <th className="p-3 text-right">AEC</th>
                  <th className="p-3">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(positions ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-mono text-xs font-bold text-slate-700">{p.code}</td>
                    <td className="p-3 text-slate-600">{p.description}</td>
                    <td className="p-3 text-slate-500">{p.chapter ?? '—'}</td>
                    <td className="p-3 text-right">{p.aec ?? '—'}</td>
                    <td className="p-3">
                      <Badge tone="blue">{p.source ?? 'manual'}</Badge>
                      {p.requires_review && <Badge tone="amber">Requiere revisión</Badge>}
                    </td>
                  </tr>
                ))}
                {(!positions || positions.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 text-sm">
                      No hay posiciones activas todavía. Importá un catálogo abajo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <NcmImportPanel jobType="ncm_catalog" title="Importar catálogo NCM" />
      </div>

      <h2 className="text-sm font-bold text-slate-900 uppercase mb-3">Versiones del catálogo</h2>
      <CatalogVersionList jobType="ncm_catalog" versions={versions ?? []} />
    </div>
  );
}
