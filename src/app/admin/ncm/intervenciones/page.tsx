import { requireAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';
import { CatalogVersionList } from '@/components/admin/CatalogVersionList';
import { NcmImportPanel } from '@/components/admin/NcmImportPanel';
import { Badge } from '@/components/ui/Badge';
import { INTERVENTION_LABELS, type InterventionAgency } from '@/types/ncm';
import type { InterventionRuleRow, CatalogVersionRow } from '@/types/database';

const SEVERITY_TONE = { info: 'blue', warning: 'amber', blocking: 'rose' } as const;

export default async function AdminInterventionRulesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: rules }, { data: versions }] = await Promise.all([
    supabase.from('intervention_rules').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(200).returns<InterventionRuleRow[]>(),
    supabase.from('intervention_rule_versions').select('*').order('created_at', { ascending: false }).returns<CatalogVersionRow[]>(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Reglas de intervención</h1>
      <p className="text-sm text-slate-500 mb-6">
        Reglas por NCM exacto o por capítulo (ANMAT, SENASA, INAL, etc.). Una regla por NCM siempre tiene prioridad
        sobre una regla de capítulo.
      </p>
      <AdminNav active="/admin/ncm/intervenciones" />

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-3">NCM / Capítulo</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Severidad</th>
                  <th className="p-3">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(rules ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 font-mono text-xs font-bold text-slate-700">{r.ncm_code || `Cap. ${r.chapter}`}</td>
                    <td className="p-3 text-slate-600">{INTERVENTION_LABELS[r.intervention_type as InterventionAgency] ?? r.intervention_type}</td>
                    <td className="p-3">
                      <Badge tone={SEVERITY_TONE[r.severity]}>{r.severity}</Badge>
                    </td>
                    <td className="p-3 text-slate-500">{r.description || '—'}</td>
                  </tr>
                ))}
                {(!rules || rules.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400 text-sm">
                      No hay reglas activas todavía. Importá un archivo abajo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <NcmImportPanel jobType="intervention_rules" title="Importar reglas de intervención" />
      </div>

      <h2 className="text-sm font-bold text-slate-900 uppercase mb-3">Versiones de reglas</h2>
      <CatalogVersionList jobType="intervention_rules" versions={versions ?? []} />
    </div>
  );
}
