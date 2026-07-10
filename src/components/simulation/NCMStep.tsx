'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { MerchandiseItem } from '@/types/simulation';
import type { NCMStatus } from '@/types/ncm';
import { NCM_STATUS_LABELS } from '@/types/ncm';
import { NCM_SAMPLES } from '@/lib/constants/ncmSamples';
import { Card } from '@/components/ui/Card';
import { Field, inputClass, selectClass } from '@/components/ui/Field';

export interface NCMStepValue {
  code: string;
  description: string;
  status: NCMStatus;
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
}: {
  value: NCMStepValue;
  onChange: (next: NCMStepValue) => void;
  items: MerchandiseItem[];
  onItemsChange: (next: MerchandiseItem[]) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string>('custom');

  function applyToItems(code: string, description: string, status: NCMStatus) {
    onItemsChange(items.map((item) => ({ ...item, ncmCode: code, ncmDescription: description, ncmStatus: status })));
  }

  function onSampleChange(key: string) {
    setSelectedKey(key);
    if (key === 'custom') {
      const next = { ...value, status: 'propuesto_cliente' as NCMStatus };
      onChange(next);
      applyToItems(value.code, value.description, next.status);
      return;
    }
    const sample = NCM_SAMPLES.find((s) => s.key === key);
    if (!sample) return;
    const next: NCMStepValue = {
      code: sample.code,
      description: sample.description,
      status: 'pendiente_validacion',
      taxRates: {
        importDuty: sample.importDuty,
        statisticalRate: sample.statisticalRate,
        iva: sample.iva,
        ivaAdditional: sample.ivaAdditional,
        ganancias: sample.ganancias,
        iibb: sample.iibb,
      },
    };
    onChange(next);
    applyToItems(next.code, next.description, next.status);
  }

  return (
    <Card step={3} title="Clasificación arancelaria (NCM)">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          La posición arancelaria propuesta por el cliente <strong>nunca es definitiva</strong>. Queda registrada
          como &ldquo;pendiente de validación PJM&rdquo; hasta que un especialista aduanero la confirme.
        </span>
      </div>

      <div className="space-y-4">
        <Field label="Seleccionar posición de referencia" htmlFor="ncm-select">
          <select
            id="ncm-select"
            className={selectClass}
            value={selectedKey}
            onChange={(e) => onSampleChange(e.target.value)}
          >
            {NCM_SAMPLES.map((s) => (
              <option key={s.key} value={s.key}>
                [{s.code}] {s.description}
              </option>
            ))}
            <option value="custom">Uso manual / personalizado (ingresar código y tasas abajo)</option>
          </select>
        </Field>

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
                applyToItems(next.code, next.description, next.status);
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
                applyToItems(next.code, next.description, next.status);
              }}
            />
          </Field>
        </div>

        <Field label="Estado de validación" htmlFor="ncm-status">
          <select
            id="ncm-status"
            className={selectClass}
            value={value.status}
            onChange={(e) => {
              const next = { ...value, status: e.target.value as NCMStatus };
              onChange(next);
              applyToItems(next.code, next.description, next.status);
            }}
          >
            {Object.entries(NCM_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-700 uppercase">Detalle del régimen arancelario</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">
              NCM Mercosur
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <RateInput
              label="Derecho importación (DIE)"
              value={value.taxRates.importDuty}
              onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, importDuty: v } })}
            />
            <RateInput
              label="Tasa de estadística (TE)"
              value={value.taxRates.statisticalRate}
              onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, statisticalRate: v } })}
            />
            <RateInput
              label="Alícuota de IVA"
              value={value.taxRates.iva}
              onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, iva: v } })}
            />
            <RateInput
              label="IVA adicional"
              value={value.taxRates.ivaAdditional}
              onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, ivaAdditional: v } })}
            />
            <RateInput
              label="Perc. Ganancias"
              value={value.taxRates.ganancias}
              onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, ganancias: v } })}
            />
            <RateInput
              label="Perc. Ingresos Brutos"
              value={value.taxRates.iibb}
              onChange={(v) => onChange({ ...value, taxRates: { ...value.taxRates, iibb: v } })}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-3 italic">
            Nota: en destinaciones oficiales en Argentina, el IVA se liquida de forma escalonada acumulando el
            valor CIF más los derechos de importación y la tasa de estadística.
          </p>
        </div>
      </div>
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
