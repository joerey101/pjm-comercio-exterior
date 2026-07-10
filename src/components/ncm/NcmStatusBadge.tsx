import { Badge } from '@/components/ui/Badge';
import { NCM_STATUS_LABELS, type NCMStatus } from '@/types/ncm';
import { NCM_STATUS_TONE } from '@/lib/constants/statusStyles';

export function NcmStatusBadge({ status }: { status: NCMStatus }) {
  return <Badge tone={NCM_STATUS_TONE[status] ?? 'slate'}>{NCM_STATUS_LABELS[status] ?? status}</Badge>;
}
