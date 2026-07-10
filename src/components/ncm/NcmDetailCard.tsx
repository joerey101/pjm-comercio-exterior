import { Badge } from '@/components/ui/Badge';
import { NcmStatusBadge } from './NcmStatusBadge';
import type { NCMStatus } from '@/types/ncm';

export function NcmDetailCard({
  code,
  description,
  aec,
  source,
  validFrom,
  validTo,
  status,
}: {
  code: string;
  description: string;
  aec: number | null;
  source: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: NCMStatus;
}) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-slate-800">{code || 'Sin código'}</span>
        <NcmStatusBadge status={status} />
      </div>
      <p className="text-sm text-slate-700">{description || 'Sin descripción'}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {aec !== null && <Badge tone="slate">AEC {aec}%</Badge>}
        <Badge tone="blue">Fuente: {source || 'manual'}</Badge>
        {(validFrom || validTo) && (
          <Badge tone="slate">
            Vigencia: {validFrom ?? '—'} {validTo ? `a ${validTo}` : '(sin fecha de fin)'}
          </Badge>
        )}
      </div>
    </div>
  );
}
