import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { NcmTaxAndInterventionDto } from '@/app/actions/ncm';
import { INTERVENTION_LABELS, type InterventionAgency } from '@/types/ncm';

const SEVERITY_STYLES = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  blocking: 'bg-rose-50 border-rose-200 text-rose-800',
} as const;

export function InterventionAlert({ interventions }: { interventions: NcmTaxAndInterventionDto['interventions'] }) {
  if (interventions.level === 'none') {
    return (
      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
        <ShieldQuestion className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Sin intervención parametrizada para esta posición. Revisá manualmente si corresponde alguna autorización.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {interventions.rules.map((rule, i) => (
        <div key={i} className={`flex items-start gap-2 border rounded-xl p-3 text-xs ${SEVERITY_STYLES[rule.severity as keyof typeof SEVERITY_STYLES]}`}>
          {rule.severity === 'blocking' ? (
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold block">
              {INTERVENTION_LABELS[rule.type as InterventionAgency] ?? rule.type} ·{' '}
              {rule.severity === 'blocking' ? 'No embarcar sin autorización' : rule.severity === 'warning' ? 'Requiere validación' : 'Informativo'}
            </span>
            {rule.description && <span>{rule.description}</span>}
            <span className="block text-[10px] opacity-70 mt-0.5">
              Regla por {interventions.level === 'ncm' ? 'NCM exacto' : 'capítulo'} · Fuente: {rule.source || 'manual'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
