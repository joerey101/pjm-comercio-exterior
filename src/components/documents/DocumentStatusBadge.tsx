import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { DOCUMENT_STATUS_LABELS, type DocumentStatus } from '@/types/documents';

const TONE: Record<DocumentStatus, BadgeTone> = {
  uploaded: 'blue',
  pending_review: 'amber',
  approved: 'emerald',
  observed: 'amber',
  rejected: 'rose',
  replaced: 'slate',
  expired: 'slate',
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge tone={TONE[status] ?? 'slate'}>{DOCUMENT_STATUS_LABELS[status] ?? status}</Badge>;
}
