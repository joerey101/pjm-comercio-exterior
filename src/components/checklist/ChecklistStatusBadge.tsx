import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { CHECKLIST_ITEM_STATUS_LABELS, type ChecklistItemStatus } from '@/types/documents';

const TONE: Record<ChecklistItemStatus, BadgeTone> = {
  pending: 'slate',
  completed_by_client: 'blue',
  approved_by_pjm: 'emerald',
  observed_by_pjm: 'amber',
  not_applicable: 'slate',
};

export function ChecklistStatusBadge({ status }: { status: ChecklistItemStatus }) {
  return <Badge tone={TONE[status] ?? 'slate'}>{CHECKLIST_ITEM_STATUS_LABELS[status] ?? status}</Badge>;
}
