'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { respondToQuote } from '@/app/actions/quotes';
import { Button } from '@/components/ui/Button';
import { textareaClass } from '@/components/ui/Field';

export function QuoteResponseForm({ quoteId, simulationId }: { quoteId: string; simulationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function respond(response: 'accepted' | 'rejected') {
    setError(null);
    startTransition(async () => {
      const res = await respondToQuote(quoteId, simulationId, response, notes);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <textarea
        rows={2}
        className={textareaClass}
        placeholder="Comentario opcional (ej. motivo de rechazo)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" disabled={isPending} onClick={() => respond('accepted')}>
          Aceptar cotización
        </Button>
        <Button type="button" variant="danger" disabled={isPending} onClick={() => respond('rejected')}>
          Rechazar
        </Button>
      </div>
    </div>
  );
}
