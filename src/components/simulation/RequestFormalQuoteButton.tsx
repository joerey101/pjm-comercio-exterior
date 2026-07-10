'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestFormalQuote } from '@/app/actions/simulations';
import { Button } from '@/components/ui/Button';

export function RequestFormalQuoteButton({ simulationId }: { simulationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await requestFormalQuote(simulationId);
      if ('error' in result) {
        setMessage(result.error);
        return;
      }
      setMessage(
        'Recibimos tu simulación. PJM revisará la posición arancelaria, documentación, gastos logísticos y supuestos de cálculo para emitir una cotización formal.'
      );
      router.refresh();
    });
  }

  return (
    <div>
      <Button type="button" onClick={handleClick} disabled={isPending}>
        {isPending ? 'Enviando…' : 'Solicitar cotización formal PJM'}
      </Button>
      {message && <p className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-3 max-w-lg">{message}</p>}
    </div>
  );
}
