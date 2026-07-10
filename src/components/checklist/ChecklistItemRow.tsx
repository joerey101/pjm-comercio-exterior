'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateChecklistItemClient, reviewChecklistItemPjm } from '@/app/actions/checklist';
import { ChecklistStatusBadge } from './ChecklistStatusBadge';
import { Button } from '@/components/ui/Button';
import type { SimulationChecklistItemRow } from '@/types/database';
import type { ChecklistItemStatus } from '@/types/documents';

export function ChecklistItemRow({ item, mode, simulationId }: { item: SimulationChecklistItemRow; mode: 'client' | 'admin'; simulationId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const status = item.status as ChecklistItemStatus;
  const checked = status === 'completed_by_client' || status === 'approved_by_pjm';

  function toggleClient() {
    startTransition(async () => {
      await updateChecklistItemClient(item.id, simulationId, !checked);
      router.refresh();
    });
  }

  function reviewAdmin(next: 'approved_by_pjm' | 'observed_by_pjm' | 'not_applicable') {
    setError(null);
    startTransition(async () => {
      const res = await reviewChecklistItemPjm(item.id, simulationId, next, notes);
      if (res && 'error' in res) {
        setError(res.error);
        return;
      }
      setNotes('');
      setShowAdminForm(false);
      router.refresh();
    });
  }

  return (
    <div className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50">
      <div className="flex items-center gap-3">
        {mode === 'client' ? (
          <input type="checkbox" checked={checked} disabled={isPending || status === 'approved_by_pjm'} onChange={toggleClient} />
        ) : (
          <span className="w-4" />
        )}
        <span className="flex-1 text-sm text-slate-700">
          {item.label}
          {item.blocking && <span className="text-[10px] text-rose-600 font-bold uppercase ml-1.5">Bloqueante</span>}
        </span>
        <ChecklistStatusBadge status={status} />
      </div>
      {item.notes && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2 ml-7">{item.notes}</p>}

      {mode === 'admin' && (
        <div className="ml-7 mt-2">
          {showAdminForm ? (
            <div className="space-y-2">
              <textarea
                rows={2}
                placeholder="Comentario (obligatorio para observar)"
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" disabled={isPending} onClick={() => reviewAdmin('approved_by_pjm')}>
                  Aprobar
                </Button>
                <Button type="button" variant="secondary" disabled={isPending} onClick={() => reviewAdmin('observed_by_pjm')}>
                  Observar
                </Button>
                <Button type="button" variant="ghost" disabled={isPending} onClick={() => reviewAdmin('not_applicable')}>
                  No aplica
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAdminForm(true)} className="text-xs text-indigo-600 hover:underline">
              Revisar ítem
            </button>
          )}
        </div>
      )}
    </div>
  );
}
