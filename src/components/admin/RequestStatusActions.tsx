'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateRequestStatus, updateRequestPriority, assignRequest, markReadyForQuote, type ReadyForQuoteBlocker } from '@/app/actions/admin';
import { PJM_REQUEST_STATUS_LABELS, REQUEST_PRIORITY_LABELS, type PjmRequestStatus, type RequestPriority } from '@/types/documents';
import { Button } from '@/components/ui/Button';
import { selectClass, textareaClass } from '@/components/ui/Field';

export function RequestStatusActions({
  requestId,
  simulationId,
  status,
  priority,
  assignedToLabel,
}: {
  requestId: string;
  simulationId: string;
  status: PjmRequestStatus;
  priority: RequestPriority;
  assignedToLabel: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<ReadyForQuoteBlocker[] | null>(null);

  function handleStatusChange(next: PjmRequestStatus) {
    setError(null);
    startTransition(async () => {
      const res = await updateRequestStatus(requestId, simulationId, next, next === 'waiting_client' ? note : undefined);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setNote('');
      router.refresh();
    });
  }

  function handlePriority(next: RequestPriority) {
    startTransition(async () => {
      await updateRequestPriority(requestId, simulationId, next);
      router.refresh();
    });
  }

  function handleAssignSelf() {
    startTransition(async () => {
      await assignRequest(requestId, simulationId, null);
      router.refresh();
    });
  }

  function handleReadyForQuote(override: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await markReadyForQuote(requestId, simulationId, override, note);
      if ('error' in res) {
        setError(res.error);
        setBlockers(res.blockers);
        return;
      }
      setBlockers(null);
      setNote('');
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Estado de la solicitud</label>
          <select className={selectClass} value={status} disabled={isPending} onChange={(e) => handleStatusChange(e.target.value as PjmRequestStatus)}>
            {Object.entries(PJM_REQUEST_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Prioridad</label>
          <select className={selectClass} value={priority} disabled={isPending} onChange={(e) => handlePriority(e.target.value as RequestPriority)}>
            {Object.entries(REQUEST_PRIORITY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Asignado a</label>
          {assignedToLabel ? (
            <p className="text-sm text-slate-700 h-10 flex items-center">{assignedToLabel}</p>
          ) : (
            <Button type="button" variant="secondary" disabled={isPending} onClick={handleAssignSelf}>
              Asignarme
            </Button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Comentario (obligatorio para &ldquo;Esperando al cliente&rdquo; o para forzar &ldquo;Listo con observaciones&rdquo;)
        </label>
        <textarea rows={2} className={textareaClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
      {blockers && blockers.length > 0 && (
        <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {blockers.map((b, i) => (
            <li key={i}>• {b.reason}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={isPending} onClick={() => handleReadyForQuote(false)}>
          Marcar listo para cotización
        </Button>
        {blockers && blockers.length > 0 && (
          <Button type="button" variant="danger" disabled={isPending} onClick={() => handleReadyForQuote(true)}>
            Marcar listo con observaciones
          </Button>
        )}
      </div>
    </div>
  );
}
