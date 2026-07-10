'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createComment } from '@/app/actions/comments';
import { Button } from '@/components/ui/Button';
import { textareaClass } from '@/components/ui/Field';

export function CommentForm({ requestId, simulationId }: { requestId: string; simulationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const comment = ref.current?.value.trim();
    if (!comment) return;
    setError(null);
    startTransition(async () => {
      const res = await createComment({
        simulationId,
        requestId,
        comment,
        commentType: visibleToClient ? 'client_visible_observation' : 'internal_note',
        visibility: visibleToClient ? 'client' : 'internal',
      });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      if (ref.current) ref.current.value = '';
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea ref={ref} rows={3} placeholder="Comentario para el equipo PJM…" className={textareaClass} />
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={visibleToClient} onChange={(e) => setVisibleToClient(e.target.checked)} />
        Visible para el cliente (se le notifica)
      </label>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? 'Guardando…' : visibleToClient ? 'Enviar observación al cliente' : 'Agregar comentario interno'}
      </Button>
    </form>
  );
}
