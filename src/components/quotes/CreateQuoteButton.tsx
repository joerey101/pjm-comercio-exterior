'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDraftQuote } from '@/app/actions/quotes';
import { Button } from '@/components/ui/Button';

export function CreateQuoteButton({ simulationId, requestId }: { simulationId: string; requestId: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await createDraftQuote(simulationId, requestId);
            if ('error' in res) {
              setError(res.error);
              return;
            }
            router.refresh();
          })
        }
      >
        Crear borrador de cotización
      </Button>
      {error && <p className="mt-2 text-sm text-rose-600 font-medium">{error}</p>}
    </div>
  );
}
