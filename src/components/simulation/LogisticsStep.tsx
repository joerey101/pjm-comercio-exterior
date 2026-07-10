'use client';

import type { MerchandiseItem } from '@/types/simulation';
import type { ContainerSelection, TransportMode } from '@/types/logistics';
import { Card } from '@/components/ui/Card';
import { Field, inputClass } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { calculateCargoSummary } from '@/lib/calculations/importCostCalculator';
import { merchandiseToCargoItem } from '@/lib/adapters';
import { getRouteTariff } from '@/lib/constants/locations';

export interface LogisticsStepValue {
  mainFreightRate: number;
  bafFsc: number;
  originLocalCharges: number;
  destinationLocalCharges: number;
  customsBrokerFee: number;
  insurancePercent: number;
  internalFreight: number;
  otherDefinitiveCosts: number;
}

const VOL_LABEL: Record<TransportMode, string> = {
  ocean_lcl: '1 CBM = 1000 kg',
  air: '1 CBM = 167 kg',
  road: '1 CBM = 333 kg',
  ocean_fcl: 'Por contenedor',
};

export function LogisticsStep({
  transportMode,
  originPort,
  destinationPort,
  items,
  containers,
  onContainersChange,
  value,
  onChange,
}: {
  transportMode: TransportMode;
  originPort: string;
  destinationPort: string;
  items: MerchandiseItem[];
  containers: ContainerSelection;
  onContainersChange: (next: ContainerSelection) => void;
  value: LogisticsStepValue;
  onChange: (next: LogisticsStepValue) => void;
}) {
  const cargoItems = items.map(merchandiseToCargoItem);
  const summary = calculateCargoSummary(transportMode, cargoItems, containers);
  const tariff = getRouteTariff(originPort, destinationPort);

  function set<K extends keyof LogisticsStepValue>(key: K, v: LogisticsStepValue[K]) {
    onChange({ ...value, [key]: v });
  }

  function useEstimatedRates() {
    onChange({
      ...value,
      mainFreightRate: transportMode === 'ocean_lcl' ? tariff.oceanLcl : transportMode === 'air' ? tariff.air : transportMode === 'road' ? tariff.road : value.mainFreightRate,
      bafFsc: tariff.fuel,
      originLocalCharges: tariff.origin,
      destinationLocalCharges: tariff.dest,
    });
  }

  return (
    <Card step={5} title="Logística internacional">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
          {VOL_LABEL[transportMode]}
        </span>
        <Button type="button" variant="secondary" onClick={useEstimatedRates}>
          Usar valores estimados PJM
        </Button>
      </div>

      {transportMode === 'ocean_fcl' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {(
            [
              { key: 'cnt20' as const, label: "20' Standard", cap: '33 CBM / 28 ton', rate: tariff.fcl20 },
              { key: 'cnt40' as const, label: "40' Standard", cap: '67 CBM / 26 ton', rate: tariff.fcl40 },
              { key: 'cnt40hc' as const, label: "40' High Cube", cap: '76 CBM / 26 ton', rate: tariff.fcl40hc },
            ]
          ).map(({ key, label, cap, rate }) => (
            <div key={key} className="p-4 border border-slate-200 rounded-xl bg-slate-50/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase block">{label}</span>
                <span className="text-[10px] text-slate-400 block mb-1">Capacidad: {cap}</span>
                <span className="text-sm font-extrabold text-indigo-600">USD {rate.toLocaleString('en-US')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onContainersChange({ ...containers, [key]: Math.max(0, containers[key] - 1) })}
                  className="w-7 h-7 bg-white border rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                >
                  -
                </button>
                <span className="w-6 text-center font-bold text-sm">{containers[key]}</span>
                <button
                  type="button"
                  onClick={() => onContainersChange({ ...containers, [key]: containers[key] + 1 })}
                  className="w-7 h-7 bg-white border rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
          <SummaryStat label="Peso bruto" value={`${summary.totalGrossWeightKg.toFixed(1)} kg`} />
          <SummaryStat label="Volumen total" value={`${summary.totalVolumeCbm.toFixed(3)} m³`} />
          <SummaryStat label="Peso volumétrico" value={`${summary.volumetricWeightKg.toFixed(1)} kg`} />
          <SummaryStat label="Peso facturable" value={`${summary.chargeableWeightKg.toFixed(1)} kg`} highlight />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase border-b pb-1">Fletes y recargos (USD)</h3>
          <Field
            label={
              transportMode === 'ocean_lcl'
                ? 'Tarifa por CBM/tonelada'
                : transportMode === 'ocean_fcl'
                  ? 'Tarifa flete local / handling'
                  : 'Tarifa por kg tasable'
            }
            htmlFor="mainFreightRate"
          >
            <input
              id="mainFreightRate"
              type="number"
              step="0.01"
              className={inputClass}
              value={value.mainFreightRate}
              onChange={(e) => set('mainFreightRate', Number(e.target.value))}
            />
          </Field>
          <Field label="Recargo combustible / BAF / FSC" htmlFor="bafFsc">
            <input
              id="bafFsc"
              type="number"
              className={inputClass}
              value={value.bafFsc}
              onChange={(e) => set('bafFsc', Number(e.target.value))}
            />
          </Field>
          <Field label="Flete interno (Argentina)" htmlFor="internalFreight">
            <input
              id="internalFreight"
              type="number"
              className={inputClass}
              value={value.internalFreight}
              onChange={(e) => set('internalFreight', Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase border-b pb-1">Gastos locales y seguro (USD)</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gastos origen" htmlFor="originLocalCharges">
              <input
                id="originLocalCharges"
                type="number"
                className={inputClass}
                value={value.originLocalCharges}
                onChange={(e) => set('originLocalCharges', Number(e.target.value))}
              />
            </Field>
            <Field label="Gastos destino" htmlFor="destinationLocalCharges">
              <input
                id="destinationLocalCharges"
                type="number"
                className={inputClass}
                value={value.destinationLocalCharges}
                onChange={(e) => set('destinationLocalCharges', Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Despacho de aduana" htmlFor="customsBrokerFee">
              <input
                id="customsBrokerFee"
                type="number"
                className={inputClass}
                value={value.customsBrokerFee}
                onChange={(e) => set('customsBrokerFee', Number(e.target.value))}
              />
            </Field>
            <Field label="Tasa de seguro (%)" htmlFor="insurancePercent">
              <input
                id="insurancePercent"
                type="number"
                step="0.01"
                className={inputClass}
                value={value.insurancePercent}
                onChange={(e) => set('insurancePercent', Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Otros costos definitivos" htmlFor="otherDefinitiveCosts">
            <input
              id="otherDefinitiveCosts"
              type="number"
              className={inputClass}
              value={value.otherDefinitiveCosts}
              onChange={(e) => set('otherDefinitiveCosts', Number(e.target.value))}
            />
          </Field>
        </div>
      </div>
    </Card>
  );
}

function SummaryStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? 'bg-indigo-50/60 p-2 rounded-lg border border-indigo-100' : ''}>
      <span className={`text-[10px] font-bold uppercase block ${highlight ? 'text-indigo-500' : 'text-slate-400'}`}>
        {label}
      </span>
      <span className={`text-base font-extrabold ${highlight ? 'text-indigo-700' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}
