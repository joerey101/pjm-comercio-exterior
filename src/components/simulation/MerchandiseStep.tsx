'use client';

import { Plus, Trash2, Info } from 'lucide-react';
import type { MerchandiseItem } from '@/types/simulation';
import { Card } from '@/components/ui/Card';
import { Field, inputClass, textareaClass } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { emptyMerchandiseItem } from '@/lib/emptySimulationDraft';

export function MerchandiseStep({
  items,
  onChange,
}: {
  items: MerchandiseItem[];
  onChange: (next: MerchandiseItem[]) => void;
}) {
  function updateItem(id: string, patch: Partial<MerchandiseItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addItem() {
    onChange([...items, emptyMerchandiseItem(`item-${Date.now()}`)]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    onChange(items.filter((item) => item.id !== id));
  }

  return (
    <Card step={2} title="Mercadería">
      <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-6 text-xs text-indigo-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>La descripción técnica es clave para clasificar correctamente la posición arancelaria.</span>
      </div>

      <div className="space-y-6">
        {items.map((item, index) => (
          <div key={item.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Ítem #{index + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Field label="Descripción comercial" htmlFor={`desc-${item.id}`}>
                <input
                  id={`desc-${item.id}`}
                  className={inputClass}
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                />
              </Field>
              <Field label="Marca / modelo" htmlFor={`brand-${item.id}`}>
                <input
                  id={`brand-${item.id}`}
                  className={inputClass}
                  value={item.brandModel}
                  onChange={(e) => updateItem(item.id, { brandModel: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Field label="Descripción técnica" htmlFor={`tech-${item.id}`}>
                <textarea
                  id={`tech-${item.id}`}
                  rows={2}
                  className={textareaClass}
                  value={item.technicalDescription}
                  onChange={(e) => updateItem(item.id, { technicalDescription: e.target.value })}
                />
              </Field>
              <Field label="Uso previsto" htmlFor={`use-${item.id}`}>
                <textarea
                  id={`use-${item.id}`}
                  rows={2}
                  className={textareaClass}
                  value={item.intendedUse}
                  onChange={(e) => updateItem(item.id, { intendedUse: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <Field label="Cantidad de unidades" htmlFor={`qty-${item.id}`}>
                <input
                  id={`qty-${item.id}`}
                  type="number"
                  min={0}
                  className={inputClass}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Valor unitario (FOB)" htmlFor={`unitval-${item.id}`}>
                <input
                  id={`unitval-${item.id}`}
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                  value={item.unitValue}
                  onChange={(e) => updateItem(item.id, { unitValue: Number(e.target.value) })}
                />
              </Field>
              <Field label="Valor total FOB" htmlFor={`totalval-${item.id}`}>
                <input
                  id={`totalval-${item.id}`}
                  disabled
                  className={inputClass + ' bg-slate-100 text-slate-500'}
                  value={(item.quantity * item.unitValue).toFixed(2)}
                />
              </Field>
              <Field label="País de fabricación" htmlFor={`origin-${item.id}`}>
                <input
                  id={`origin-${item.id}`}
                  className={inputClass}
                  value={item.countryOfOrigin}
                  onChange={(e) => updateItem(item.id, { countryOfOrigin: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <Field label="Peso bruto (kg)" htmlFor={`gw-${item.id}`}>
                <input
                  id={`gw-${item.id}`}
                  type="number"
                  min={0}
                  className={inputClass}
                  value={item.grossWeightKg}
                  onChange={(e) => updateItem(item.id, { grossWeightKg: Number(e.target.value) })}
                />
              </Field>
              <Field label="Peso neto (kg)" htmlFor={`nw-${item.id}`}>
                <input
                  id={`nw-${item.id}`}
                  type="number"
                  min={0}
                  className={inputClass}
                  value={item.netWeightKg}
                  onChange={(e) => updateItem(item.id, { netWeightKg: Number(e.target.value) })}
                />
              </Field>
              <Field label="Largo (cm)" htmlFor={`l-${item.id}`}>
                <input
                  id={`l-${item.id}`}
                  type="number"
                  min={0}
                  className={inputClass}
                  value={item.lengthCm}
                  onChange={(e) => updateItem(item.id, { lengthCm: Number(e.target.value) })}
                />
              </Field>
              <Field label="Ancho (cm)" htmlFor={`w-${item.id}`}>
                <input
                  id={`w-${item.id}`}
                  type="number"
                  min={0}
                  className={inputClass}
                  value={item.widthCm}
                  onChange={(e) => updateItem(item.id, { widthCm: Number(e.target.value) })}
                />
              </Field>
              <Field label="Alto (cm)" htmlFor={`h-${item.id}`}>
                <input
                  id={`h-${item.id}`}
                  type="number"
                  min={0}
                  className={inputClass}
                  value={item.heightCm}
                  onChange={(e) => updateItem(item.id, { heightCm: Number(e.target.value) })}
                />
              </Field>
              <Field label="Cant. de bultos" htmlFor={`pkg-${item.id}`}>
                <input
                  id={`pkg-${item.id}`}
                  type="number"
                  min={1}
                  className={inputClass}
                  value={item.packages}
                  onChange={(e) => updateItem(item.id, { packages: Number(e.target.value) })}
                />
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Tipo de embalaje" htmlFor={`pkgtype-${item.id}`}>
                <input
                  id={`pkgtype-${item.id}`}
                  className={inputClass}
                  placeholder="Ej: Pallet, caja de cartón, bolsón"
                  value={item.packagingType}
                  onChange={(e) => updateItem(item.id, { packagingType: e.target.value })}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" onClick={addItem} className="mt-4">
        <Plus className="w-4 h-4" />
        Agregar ítem
      </Button>
    </Card>
  );
}
