import { CHECKLIST_CATEGORY_LABELS, type ChecklistCategory } from '@/types/documents';
import { ChecklistItemRow } from './ChecklistItemRow';
import type { SimulationChecklistItemRow } from '@/types/database';

export function ChecklistCategoryGroup({
  category,
  items,
  mode,
  simulationId,
}: {
  category: ChecklistCategory;
  items: SimulationChecklistItemRow[];
  mode: 'client' | 'admin';
  simulationId: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{CHECKLIST_CATEGORY_LABELS[category]}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <ChecklistItemRow key={item.id} item={item} mode={mode} simulationId={simulationId} />
        ))}
      </div>
    </div>
  );
}
