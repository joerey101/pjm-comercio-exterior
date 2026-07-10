import { ChecklistSummaryCard } from './ChecklistSummaryCard';
import { ChecklistCategoryGroup } from './ChecklistCategoryGroup';
import type { SimulationChecklistItemRow } from '@/types/database';
import type { ChecklistCategory, ChecklistSemaphore } from '@/types/documents';

const CATEGORY_ORDER: ChecklistCategory[] = ['commercial', 'customs', 'tax', 'logistics', 'interventions', 'documents', 'internal_pjm'];

export function ChecklistPanel({
  items,
  semaphore,
  mode,
  simulationId,
}: {
  items: SimulationChecklistItemRow[];
  semaphore: ChecklistSemaphore;
  mode: 'client' | 'admin';
  simulationId: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        El checklist operativo se genera automáticamente al solicitar la cotización formal a PJM.
      </p>
    );
  }

  const done = items.filter((i) => i.status === 'approved_by_pjm').length;

  return (
    <div className="space-y-5">
      <ChecklistSummaryCard semaphore={semaphore} total={items.length} done={done} />
      {CATEGORY_ORDER.map((category) => (
        <ChecklistCategoryGroup
          key={category}
          category={category}
          items={items.filter((i) => i.category === category)}
          mode={mode}
          simulationId={simulationId}
        />
      ))}
    </div>
  );
}
