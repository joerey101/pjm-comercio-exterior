'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addRegulatoryReference, toggleRegulatoryReference, deleteRegulatoryReference } from '@/app/actions/integrations';
import { Button } from '@/components/ui/Button';
import { inputClass, selectClass } from '@/components/ui/Field';
import { REGULATORY_REFERENCE_CATEGORY_LABELS, type RegulatoryReferenceCategory } from '@/types/integrations';
import type { RegulatoryReferenceRow } from '@/types/database';

export function RegulatoryReferenceManager({ references }: { references: RegulatoryReferenceRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ category: RegulatoryReferenceCategory; title: string; description: string; url: string; ncmCode: string }>({
    category: 'bcra',
    title: '',
    description: '',
    url: '',
    ncmCode: '',
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select className={selectClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RegulatoryReferenceCategory })}>
          {Object.entries(REGULATORY_REFERENCE_CATEGORY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <input className={inputClass} placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={inputClass} placeholder="NCM (opcional)" value={form.ncmCode} onChange={(e) => setForm({ ...form, ncmCode: e.target.value })} />
        <input className={inputClass} placeholder="URL (opcional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <input className={`${inputClass} sm:col-span-2`} placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
      <Button
        type="button"
        variant="secondary"
        disabled={isPending || !form.title.trim()}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await addRegulatoryReference({
              category: form.category,
              title: form.title,
              description: form.description || null,
              url: form.url || null,
              ncmCode: form.ncmCode || null,
            });
            if ('error' in res) {
              setError(res.error);
              return;
            }
            setForm({ category: 'bcra', title: '', description: '', url: '', ncmCode: '' });
            router.refresh();
          })
        }
      >
        Agregar referencia
      </Button>

      <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
        {references.map((ref) => (
          <div key={ref.id} className="py-2.5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                [{REGULATORY_REFERENCE_CATEGORY_LABELS[ref.category as RegulatoryReferenceCategory] ?? ref.category}] {ref.title}
                {ref.ncm_code && <span className="text-slate-400 font-normal"> · NCM {ref.ncm_code}</span>}
              </p>
              {ref.description && <p className="text-xs text-slate-500">{ref.description}</p>}
              {ref.url && (
                <a href={ref.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">
                  {ref.url}
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="text-xs text-slate-500 hover:underline"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await toggleRegulatoryReference(ref.id, !ref.is_active);
                    router.refresh();
                  })
                }
              >
                {ref.is_active ? 'Desactivar' : 'Activar'}
              </button>
              <button
                type="button"
                className="text-xs text-rose-600 hover:underline"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteRegulatoryReference(ref.id);
                    router.refresh();
                  })
                }
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {references.length === 0 && <p className="text-xs text-slate-400 py-2">Sin referencias cargadas.</p>}
      </div>
    </div>
  );
}
