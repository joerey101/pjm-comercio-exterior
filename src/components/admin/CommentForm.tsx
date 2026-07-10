'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addInternalComment } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { textareaClass } from '@/components/ui/Field';

export function CommentForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const comment = ref.current?.value.trim();
    if (!comment) return;
    startTransition(async () => {
      await addInternalComment(requestId, comment);
      if (ref.current) ref.current.value = '';
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea ref={ref} rows={3} placeholder="Comentario interno para el equipo PJM…" className={textareaClass} />
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? 'Guardando…' : 'Agregar comentario interno'}
      </Button>
    </form>
  );
}
