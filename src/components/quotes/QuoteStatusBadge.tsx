import { Badge } from '@/components/ui/Badge';
import { FORMAL_QUOTE_STATUS_LABELS, type FormalQuoteStatus } from '@/types/quotes';
import { FORMAL_QUOTE_STATUS_TONE } from '@/lib/constants/statusStyles';

export function QuoteStatusBadge({ status }: { status: FormalQuoteStatus }) {
  return <Badge tone={FORMAL_QUOTE_STATUS_TONE[status]}>{FORMAL_QUOTE_STATUS_LABELS[status]}</Badge>;
}
