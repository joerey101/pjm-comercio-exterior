import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { REQUEST_PRIORITY_LABELS, type RequestPriority } from '@/types/documents';

const TONE: Record<RequestPriority, BadgeTone> = {
  low: 'slate',
  normal: 'blue',
  high: 'amber',
  urgent: 'rose',
};

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return <Badge tone={TONE[priority] ?? 'slate'}>{REQUEST_PRIORITY_LABELS[priority] ?? priority}</Badge>;
}
