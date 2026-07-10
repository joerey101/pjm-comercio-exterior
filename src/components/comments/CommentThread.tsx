import { VisibilityBadge } from './VisibilityBadge';
import type { CommentRow } from '@/types/database';
import type { CommentVisibility } from '@/types/documents';

export function CommentThread({ comments }: { comments: CommentRow[] }) {
  if (comments.length === 0) {
    return <p className="text-xs text-slate-400">Sin comentarios todavía.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between mb-1">
            <VisibilityBadge visibility={c.visibility as CommentVisibility} />
            <span className="text-[10px] text-slate-400 uppercase font-bold">{new Date(c.created_at).toLocaleString('es-AR')}</span>
          </div>
          <p className="text-slate-700">{c.comment}</p>
        </div>
      ))}
    </div>
  );
}
