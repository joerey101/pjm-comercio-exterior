'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Ship, Container, Plane, Truck } from 'lucide-react';
import type { TransportMode } from '@/types/logistics';
import type { Incoterm } from '@/types/simulation';
import { calculateSimulationSummary } from '@/lib/calculations/importCostCalculator';
import { NCM_SAMPLES } from '@/lib/constants/ncmSamples';
import { locationsForMode, getRouteTariff } from '@/lib/constants/locations';
import { Card } from '@/components/ui/Card';
import { Field, inputClass, selectClass } from '@/components/ui/Field';
import { formatMoney } from '@/lib/formatMoney';

const MODES: { value: TransportMode; label: string; icon: typeof Ship }[] = [
  { value: 'ocean_lcl', label: 'Marítimo LCL', icon: Ship },
  { value: 'ocean_fcl', label: 'Marítimo FCL', icon: Container },
  { value: 'air', label: 'Aéreo', icon: Plane },
  { value: 'road', label: 'Terrestre', icon: Truck },
];

export function PublicSimulator() {
  const [transportMode, setTransportMode] = useState<TransportMode>('ocean_lcl');
  const [incoterm, setIncoterm] = useState<Incoterm>('FOB');
  const [fobValue, setFobValue] = useState(15000);
  const [units, setUnits] = useState(500);
  const [cbm, setCbm] = useState(8);
  const [grossWeight, setGrossWeight] = useState(1200);
  const [ncmKey, setNcmKey] = useState('notebooks');
  const [insurancePercent, setInsurancePercent] = useState(0.35);

  const locations = locationsForMode(transportMode);
  const tariff = getRouteTariff(locations[0]?.id ?? 'CNSHA', locations.find((l) => l.country === 'Argentina')?.id ?? 'ARADU');
  const ncm = NCM_SAMPLES.find((s) => s.key === ncmKey) ?? NCM_SAMPLES[0];

  const summary = useMemo(() => {
    const cargoItems = [{ id: 'preview', name: 'Carga estimada', qty: 1, lengthCm: 100, widthCm: 100, heightCm: (cbm * 1_000_000) / 10_000, weightKg: grossWeight }];
    const rate = transportMode === 'ocean_lcl' ? tariff.oceanLcl : transportMode === 'air' ? tariff.air : transportMode === 'road' ? tariff.road : 0;
    return calculateSimulationSummary({
      // Public simulator has a single representative item
      items: [{
        id: 'preview',
        fobValue,
        taxRates: {
          importDuty: ncm.importDuty,
          statisticalRate: ncm.statisticalRate,
          iva: ncm.iva,
          ivaAdditional: ncm.ivaAdditional,
          ganancias: ncm.ganancias,
          iibb: ncm.iibb,
        },
      }],
      totalUnits: units,
      transportMode,
      incoterm,
      cargoItems,
      containers: { cnt20: 0, cnt40: transportMode === 'ocean_fcl' ? 1 : 0, cnt40hc: 0 },
      freightRates: { mainFreightRate: rate, bafFsc: tariff.fuel, fclRates: { cnt20: tariff.fcl20, cnt40: tariff.fcl40, cnt40hc: tariff.fcl40hc } },
      insurancePercent,
      originLocalCharges: tariff.origin,
      destinationLocalCharges: tariff.dest,
      customsBrokerFee: 250,
      internalFreight: 0,
      otherDefinitiveCosts: 0,
    });
  }, [fobValue, units, transportMode, incoterm, cbm, grossWeight, tariff, insurancePercent, ncm]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 w-full grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <Card step={1} title="Modalidad e Incoterm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {MODES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTransportMode(value)}
                className={`p-3 border-2 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                  transportMode === value ? 'bg-indigo-50/50 border-indigo-600 text-indigo-900' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-bold">{label}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Incoterm" htmlFor="incoterm">
              <select id="incoterm" className={selectClass} value={incoterm} onChange={(e) => setIncoterm(e.target.value as Incoterm)}>
                <option value="EXW">EXW</option>
                <option value="FOB">FOB</option>
                <option value="CFR">CFR</option>
                <option value="CIF">CIF</option>
                <option value="DAP">DAP</option>
                <option value="DDP">DDP</option>
              </select>
            </Field>
            <Field label="Posición NCM de referencia" htmlFor="ncm">
              <select id="ncm" className={selectClass} value={ncmKey} onChange={(e) => setNcmKey(e.target.value)}>
                {NCM_SAMPLES.map((s) => (
                  <option key={s.key} value={s.key}>
                    [{s.code}] {s.description}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        <Card step={2} title="Mercadería y carga">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Valor FOB (USD)" htmlFor="fob">
              <input id="fob" type="number" className={inputClass} value={fobValue} onChange={(e) => setFobValue(Number(e.target.value))} />
            </Field>
            <Field label="Cantidad de unidades" htmlFor="units">
              <input id="units" type="number" className={inputClass} value={units} onChange={(e) => setUnits(Number(e.target.value))} />
            </Field>
            <Field label="Volumen (CBM)" htmlFor="cbm">
              <input id="cbm" type="number" className={inputClass} value={cbm} onChange={(e) => setCbm(Number(e.target.value))} />
            </Field>
            <Field label="Peso bruto (kg)" htmlFor="weight">
              <input id="weight" type="number" className={inputClass} value={grossWeight} onChange={(e) => setGrossWeight(Number(e.target.value))} />
            </Field>
          </div>
          <div className="mt-4 max-w-xs">
            <Field label="Tasa de seguro (%)" htmlFor="insurance">
              <input
                id="insurance"
                type="number"
                step="0.01"
                className={inputClass}
                value={insurancePercent}
                onChange={(e) => setInsurancePercent(Number(e.target.value))}
              />
            </Field>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden sticky top-8">
          <div className="bg-indigo-600 px-6 py-5 text-white">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-200">Resultado estimado</span>
            <h3 className="text-xl font-extrabold">Caja necesaria para liberar</h3>
          </div>
          <div className="p-6 space-y-3 text-sm">
            <SummaryRow label="Valor FOB" value={formatMoney(fobValue, 'USD')} />
            <SummaryRow label="Flete + seguro" value={formatMoney(summary.freight + summary.insurance, 'USD')} />
            <SummaryRow label="Valor CIF" value={formatMoney(summary.cif, 'USD')} />
            <SummaryRow label="Tributos definitivos (DIE + TE)" value={formatMoney(summary.customsDuty + summary.statisticalRate, 'USD')} />
            <SummaryRow label="Créditos fiscales" value={formatMoney(summary.fiscalCredits, 'USD')} />
            <SummaryRow label="Costo económico definitivo" value={formatMoney(summary.definitiveCost, 'USD')} />
            <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
              <span className="text-xs font-bold text-slate-400 uppercase">Caja necesaria</span>
              <span className="text-2xl font-black text-slate-900">{formatMoney(summary.cashRequired, 'USD')}</span>
            </div>
            <SummaryRow label="Costo unitario" value={formatMoney(summary.unitCost, 'USD')} />

            <div className="pt-4 mt-2 border-t border-slate-200 space-y-3">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Esta es una simulación pública, no vinculante. Registrate para guardar esta simulación, descargar
                el PDF preliminar y solicitar cotización formal a PJM.
              </p>
              <Link
                href="/registro"
                className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                Crear cuenta gratis
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
