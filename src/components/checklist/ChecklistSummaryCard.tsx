import { CHECKLIST_SEMAPHORE_LABEL, type ChecklistSemaphore } from '@/types/documents';

const DOT_CLASSES: Record<ChecklistSemaphore, string> = {
  draft: 'bg-slate-400',
  red: 'bg-rose-500',
  yellow: 'bg-amber-500',
  green: 'bg-emerald-500',
};

export function ChecklistSummaryCard({ semaphore, total, done }: { semaphore: ChecklistSemaphore; total: number; done: number }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
      <span className={`w-3 h-3 rounded-full shrink-0 ${DOT_CLASSES[semaphore]}`} />
      <div>
        <span className="text-sm font-bold text-slate-700 block">{CHECKLIST_SEMAPHORE_LABEL[semaphore]}</span>
        <span className="text-xs text-slate-400">
          {done} de {total} ítems aprobados
        </span>
      </div>
    </div>
  );
}
