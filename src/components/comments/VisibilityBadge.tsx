import { Badge } from '@/components/ui/Badge';
import type { CommentVisibility } from '@/types/documents';

export function VisibilityBadge({ visibility }: { visibility: CommentVisibility }) {
  return visibility === 'client' ? <Badge tone="blue">Visible al cliente</Badge> : <Badge tone="slate">Interno</Badge>;
}
