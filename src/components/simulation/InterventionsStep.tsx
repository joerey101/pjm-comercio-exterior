'use client';

import type { InterventionSelection, } from '@/types/simulation';
import type { InterventionAgency, InterventionRisk } from '@/types/ncm';
import { INTERVENTION_LABELS } from '@/types/ncm';
import { RISK_SEMAPHORE_CLASSES, RISK_SEMAPHORE_LABEL } from '@/lib/constants/statusStyles';
import { Card } from '@/components/ui/Card';
import { textareaClass } from '@/components/ui/Field';

const AGENCY_OPTIONS = Object.keys(INTERVENTION_LABELS).filter(
  (k) => k !== 'sin_intervencion' && k !== 'requiere_validacion'
) as InterventionAgency[];

const RISK_OPTIONS: InterventionRisk[] = ['verde', 'amarillo', 'rojo'];

export function InterventionsStep({
  value,
  onChange,
}: {
  value: InterventionSelection;
  onChange: (next: InterventionSelection) => void;
}) {
  function toggleAgency(agency: InterventionAgency) {
    const has = value.agencies.includes(agency);
    const agencies = has ? value.agencies.filter((a) => a !== agency) : [...value.agencies.filter((a) => a !== 'sin_intervencion'), agency];
    onChange({ ...value, agencies: agencies.length ? agencies : ['sin_intervencion'] });
  }

  return (
    <Card step={4} title="Intervenciones y permisos">
      {value.notes.includes('Detectado automáticamente') && value.agencies[0] !== 'sin_intervencion' && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-xl p-3 mb-4 font-medium flex items-start gap-2">
          <span className="text-indigo-600">✨</span>
          <span>
            Basado en la posición NCM seleccionada, hemos pre-seleccionado las intervenciones sugeridas.
            Podés ajustarlas manualmente si es necesario.
          </span>
        </div>
      )}

      <p className="text-xs text-slate-500 mb-4">
        Marcá los organismos que podrían requerir autorización previa para esta mercadería. Este módulo es
        preliminar en el MVP: PJM confirmará las intervenciones reales al revisar tu simulación.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
        <label className="flex items-center gap-2 text-xs font-semibold p-2 rounded-lg border border-slate-200 bg-slate-50">
          <input
            type="checkbox"
            checked={value.agencies.includes('sin_intervencion')}
            onChange={() => onChange({ ...value, agencies: ['sin_intervencion'] })}
          />
          Sin intervención detectada
        </label>
        {AGENCY_OPTIONS.map((agency) => (
          <label
            key={agency}
            className="flex items-center gap-2 text-xs font-semibold p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <input type="checkbox" checked={value.agencies.includes(agency)} onChange={() => toggleAgency(agency)} />
            {INTERVENTION_LABELS[agency]}
          </label>
        ))}
      </div>

      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Semáforo de riesgo documental
      </label>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {RISK_OPTIONS.map((risk) => (
          <button
            key={risk}
            type="button"
            onClick={() => onChange({ ...value, risk })}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
              value.risk === risk ? 'border-slate-800' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className={`w-4 h-4 rounded-full ${RISK_SEMAPHORE_CLASSES[risk]}`} />
            <span className="text-[11px] font-bold text-slate-700 text-center">{RISK_SEMAPHORE_LABEL[risk]}</span>
          </button>
        ))}
      </div>

      <textarea
        rows={2}
        placeholder="Notas sobre intervenciones (opcional)"
        className={textareaClass}
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
      />
    </Card>
  );
}
