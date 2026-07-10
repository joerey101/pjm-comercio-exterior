'use client';

import type { OperationData, OperationType, Incoterm, Currency } from '@/types/simulation';
import type { TransportMode } from '@/types/logistics';
import { Card } from '@/components/ui/Card';
import { Field, inputClass, selectClass } from '@/components/ui/Field';
import { locationsForMode } from '@/lib/constants/locations';
import { Ship, Container, Plane, Truck } from 'lucide-react';

const MODES: { value: TransportMode; label: string; sub: string; icon: typeof Ship }[] = [
  { value: 'ocean_lcl', label: 'Marítimo LCL', sub: 'Carga suelta', icon: Ship },
  { value: 'ocean_fcl', label: 'Marítimo FCL', sub: 'Contenedor lleno', icon: Container },
  { value: 'air', label: 'Aéreo', sub: 'IATA Cargo', icon: Plane },
  { value: 'road', label: 'Terrestre', sub: 'Camión completo', icon: Truck },
];

export function OperationStep({
  value,
  onChange,
}: {
  value: OperationData;
  onChange: (next: OperationData) => void;
}) {
  const locations = locationsForMode(value.transportMode);

  function set<K extends keyof OperationData>(key: K, v: OperationData[K]) {
    onChange({ ...value, [key]: v });
  }

  function onModeChange(mode: TransportMode) {
    const opts = locationsForMode(mode);
    onChange({
      ...value,
      transportMode: mode,
      originPort: opts[0]?.id ?? '',
      destinationPort: opts.find((l) => l.country === 'Argentina')?.id ?? opts[1]?.id ?? '',
      originCountry: opts[0]?.country ?? '',
    });
  }

  return (
    <Card step={1} title="Datos de la operación">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label="Tipo de operación" htmlFor="operationType">
          <select
            id="operationType"
            className={selectClass}
            value={value.operationType}
            onChange={(e) => set('operationType', e.target.value as OperationType)}
          >
            <option value="importacion">Importación</option>
            <option value="exportacion">Exportación</option>
          </select>
        </Field>
        <Field label="Incoterm" htmlFor="incoterm">
          <select
            id="incoterm"
            className={selectClass}
            value={value.incoterm}
            onChange={(e) => set('incoterm', e.target.value as Incoterm)}
          >
            <option value="EXW">EXW - Ex Works</option>
            <option value="FOB">FOB - Free On Board</option>
            <option value="CFR">CFR - Cost and Freight</option>
            <option value="CIF">CIF - Cost, Insurance & Freight</option>
            <option value="DAP">DAP - Delivered At Place</option>
            <option value="DDP">DDP - Delivered Duty Paid</option>
          </select>
        </Field>
      </div>

      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Vía de transporte
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {MODES.map(({ value: mode, label, sub, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            className={`p-3 border-2 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
              value.transportMode === mode
                ? 'bg-indigo-50/50 border-indigo-600 text-indigo-900'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold block">{label}</span>
            <span className="text-[10px] text-slate-500">{sub}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label="Origen" htmlFor="originPort">
          <select
            id="originPort"
            className={selectClass}
            value={value.originPort}
            onChange={(e) => {
              const loc = locations.find((l) => l.id === e.target.value);
              onChange({ ...value, originPort: e.target.value, originCountry: loc?.country ?? value.originCountry });
            }}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} — {loc.country}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Destino" htmlFor="destinationPort">
          <select
            id="destinationPort"
            className={selectClass}
            value={value.destinationPort}
            onChange={(e) => set('destinationPort', e.target.value)}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} — {loc.country}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label="Destino final en Argentina" htmlFor="finalDestination">
          <input
            id="finalDestination"
            className={inputClass}
            placeholder="Ej: Depósito propio, Pilar, Bs. As."
            value={value.finalDestination}
            onChange={(e) => set('finalDestination', e.target.value)}
          />
        </Field>
        <Field label="Moneda" htmlFor="currency">
          <select
            id="currency"
            className={selectClass}
            value={value.currency}
            onChange={(e) => set('currency', e.target.value as Currency)}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="ARS">ARS</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Field label="Fecha estimada de embarque" htmlFor="shipmentDate">
          <input
            id="shipmentDate"
            type="date"
            className={inputClass}
            value={value.shipmentDate ?? ''}
            onChange={(e) => set('shipmentDate', e.target.value || null)}
          />
        </Field>
        <Field label="Fecha estimada de arribo" htmlFor="arrivalDate">
          <input
            id="arrivalDate"
            type="date"
            className={inputClass}
            value={value.arrivalDate ?? ''}
            onChange={(e) => set('arrivalDate', e.target.value || null)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Proveedor" htmlFor="supplier">
          <input id="supplier" className={inputClass} value={value.supplier} onChange={(e) => set('supplier', e.target.value)} />
        </Field>
        <Field label="Comprador / importador" htmlFor="buyer">
          <input id="buyer" className={inputClass} value={value.buyer} onChange={(e) => set('buyer', e.target.value)} />
        </Field>
      </div>
    </Card>
  );
}
