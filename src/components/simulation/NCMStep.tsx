'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, PencilLine } from 'lucide-react';
import type { MerchandiseItem, InterventionSelection } from '@/types/simulation';
import type { NCMStatus, InterventionRisk } from '@/types/ncm';
import { getTaxAndInterventionsForNcm, type NcmSearchResultDto, type NcmTaxAndInterventionDto } from '@/app/actions/ncm';
import { interventionRiskFor } from '@/lib/ncm/matchInterventionRules';
import { Card } from '@/components/ui/Card';
import { Field, inputClass, selectClass } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { NcmSearchBox } from '@/components/ncm/NcmSearchBox';
import { NcmDetailCard } from '@/components/ncm/NcmDetailCard';
import { TaxParameterCard } from '@/components/ncm/TaxParameterCard';
import { InterventionAlert } from '@/components/ncm/InterventionAlert';
import { NCM_STATUS_LABELS } from '@/types/ncm';

export interface NCMStepValue {
  code: string;
  description: string;
  status: NCMStatus;
  positionId: string | null;
  source: 'catalog' | 'manual';
  taxParameterId: string | null;
  aec: number | null;
  catalogSource: string | null;
  validFrom: string | null;
  validTo: string | null;
  taxRates: {
    importDuty: number;
    statisticalRate: number;
    iva: number;
    ivaAdditional: number;
    ganancias: number;
    iibb: number;
  };
}

export function NCMStep({
  value,
  onChange,
  items,
  onItemsChange,
  onInterventionMatch,
}: {
  value: NCMStepValue;
  onChange: (next: NCMStepValue) => void;
  items: MerchandiseItem[];
  onItemsChange: (next: MerchandiseItem[]) => void;
  onInterventionMatch: (intervention: InterventionSelection) => void;
}) {
  const [manualMode, setManualMode] = useState(false);
  const [lookup, setLookup] = useState<NcmTaxAndInterventionDto | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyToItems(code: string, description: string, status: NCMStatus, positionId: string | null, source: 'catalog' | 'manual', taxParameterId: string | null) {
    onItemsChange(
      items.map((item) => ({
        ...item,
        ncmCode: code,
        ncmDescription: description,
        ncmStatus: status,
        ncmPositionId: positionId,
        ncmSource: source,
        taxParameterId,
      }))
    );
  }

  function onSelectResult(result: NcmSearchResultDto) {
    setManualMode(false);
    startTransition(async () => {
      const data = await getTaxAndInterventionsForNcm(result.code);
      setLookup(data);

      const next: NCMStepValue = {
        code: result.code,
        description: result.description,
        status: 'pendiente_validacion',
        positionId: result.id,
        source: 'catalog',
        taxParameterId: data.taxParameters?.id ?? null,
        aec: result.aec,
        catalogSource: result.source,
        validFrom: result.validFrom,
        validTo: result.validTo,
        taxRates: data.taxParameters
          ? {
              importDuty: data.taxParameters.importDuty,
              statisticalRate: data.taxParameters.statisticalRate,
              iva: data.taxParameters.iva,
              ivaAdditional: data.taxParameters.ivaAdditional,
              ganancias: data.taxParameters.ganancias,
              iibb: data.taxParameters.iibb,
            }
          : value.taxRates,
      };
      onChange(next);
      applyToItems(next.code, next.description, next.status, next.positionId, next.source, next.taxParameterId);

      const risk: InterventionRisk = interventionRiskFor(
        data.interventions.rules.map((r) => ({
          id: '',
          normalizedNcmCode: null,
          chapter: null,
          interventionType: r.type as never,
          description: r.description,
          severity: r.severity as 'info' | 'warning' | 'blocking',
          isActive: true,
        }))
      );
      onInterventionMatch({
        agencies: data.interventions.rules.length > 0 ? (data.interventions.rules.map((r) => r.type) as never) : ['sin_intervencion'],
        risk,
        notes:
          data.interventions.level === 'none'
            ? ''
            : `Detectado automáticamente por ${data.interventions.level === 'ncm' ? 'NCM exacto' : 'capítulo'} al seleccionar NCM ${result.code}.`,
      });
    });
  }

  function enableManual() {
    setManualMode(true);
    setLookup(null);
    const next: NCMStepValue = {
      ...value,
      status: 'propuesto_cliente',
      positionId: null,
      source: 'manual',
      taxParameterId: null,
      catalogSource: null,
      validFrom: null,
      validTo: null,
    };
    onChange(next);
    applyToItems(next.code, next.description, next.status, null, 'manual', null);
  }

  return (
    <Card step={3} title="Clasificación arancelaria (NCM)">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          La posición arancelaria sugerida <strong>nunca es definitiva</strong>. Queda registrada como
          &ldquo;pendiente de validación PJM&rdquo; hasta que un especialista aduanero la confirme.
        </span>
      </div>

      {!manualMode && (
        <div className="space-y-4">
          <NcmSearchBox onSelect={onSelectResult} />
          <button type="button" onClick={enableManual} className="text-xs text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1">
            <PencilLine className="w-3.5 h-3.5" />
            No encuentro la posición, cargar código manualmente
          </button>
        </div>
      )}

      {manualMode && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Código NCM (8 dígitos)" htmlFor="ncm-code">
              <input
                id="ncm-code"
                className={inputClass}
                placeholder="0000.00.00"
                value={value.code}
                onChange={(e) => {
                  const next = { ...value, code: e.target.value };
                  onChange(next);
                  applyToItems(next.code, next.description, next.status, null, 'manual', null);
                }}
              />
            </Field>
            <Field label="Descripción" htmlFor="ncm-description">
              <input
                id="ncm-description"
                className={inputClass}
                value={value.description}
                onChange={(e) => {
                  const next = { ...value, description: e.target.value };
                  onChange(next);
                  applyToItems(next.code, next.description, next.status, null, 'manual', null);
                }}
              />
            </Field>
          </div>
          <button type="button" onClick={() => setManualMode(false)} className="text-xs text-indigo-600 hover:underline">
            Volver al buscador
          </button>
        </div>
      )}

      {(value.code || manualMode) && (
        <div className="mt-5 space-y-4">
          <NcmDetailCard
            code={value.code}
            description={value.description}
            aec={value.aec}
            source={value.catalogSource ?? (manualMode ? 'manual' : null)}
            validFrom={value.validFrom}
            validTo={value.validTo}
            status={value.status}
          />

          <Field label="Estado de validación" htmlFor="ncm-status">
            <select
              id="ncm-status"
              className={selectClass}
              value={value.status}
              onChange={(e) => {
                const next = { ...value, status: e.target.value as NCMStatus };
                onChange(next);
                applyToItems(next.code, next.description, next.status, next.positionId, next.source, next.taxParameterId);
              }}
            >
              {Object.entries(NCM_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          {isPending && <p className="text-xs text-slate-400">Buscando tributos e intervenciones parametrizadas…</p>}

          {!isPending && lookup && <TaxParameterCard taxParameters={lookup.taxParameters} />}
          {!isPending && lookup && <InterventionAlert interventions={lookup.interventions} />}

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase">
                {lookup?.taxParameters || !manualMode ? 'Tasas aplicadas (editables)' : 'Cargar tasas manualmente'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <RateInput label="Derecho importación (DIE)" value={value.taxRates.importDuty} onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, importDuty: v } })} />
              <RateInput label="Tasa de estadística (TE)" value={value.taxRates.statisticalRate} onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, statisticalRate: v } })} />
              <RateInput label="Alícuota de IVA" value={value.taxRates.iva} onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, iva: v } })} />
              <RateInput label="IVA adicional" value={value.taxRates.ivaAdditional} onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, ivaAdditional: v } })} />
              <RateInput label="Perc. Ganancias" value={value.taxRates.ganancias} onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, ganancias: v } })} />
              <RateInput label="Perc. Ingresos Brutos" value={value.taxRates.iibb} onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, iibb: v } })} />
            </div>
          </div>
        </div>
      )}

      {!lookup && !manualMode && !value.code && (
        <div className="mt-4">
          <Button type="button" variant="ghost" disabled>
            Elegí una posición del buscador para continuar
          </Button>
        </div>
      )}
    </Card>
  );
}

function RateInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-slate-500 font-semibold mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-8 pl-2 pr-5 border border-slate-300 rounded bg-white text-center font-bold text-slate-800"
        />
        <span className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 font-bold text-xs">%</span>
      </div>
    </div>
  );
}
