'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDocumentStatus } from '@/app/actions/documents';
import { Button } from '@/components/ui/Button';
import { textareaClass } from '@/components/ui/Field';

export function DocumentReviewActions({ documentId, simulationId }: { documentId: string; simulationId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(status: 'approved' | 'observed' | 'rejected') {
    setError(null);
    startTransition(async () => {
      const res = await updateDocumentStatus(documentId, simulationId, status, notes);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setNotes('');
      router.refresh();
    });
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        rows={2}
        placeholder="Comentario (obligatorio para observar o rechazar; se muestra al cliente)"
        className={textareaClass}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={isPending} onClick={() => act('approved')}>
          Aprobar
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => act('observed')}>
          Observar
        </Button>
        <Button type="button" variant="danger" disabled={isPending} onClick={() => act('rejected')}>
          Rechazar
        </Button>
      </div>
    </div>
  );
}
