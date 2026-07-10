import type { NcmSearchResultDto } from '@/app/actions/ncm';
import { Badge } from '@/components/ui/Badge';

const REASON_LABEL: Record<string, string> = {
  exact_code: 'Código exacto',
  code_prefix: 'Código similar',
  description: 'Coincide en descripción',
  chapter: 'Coincide en capítulo',
};

export function NcmResultList({ results, onSelect }: { results: NcmSearchResultDto[]; onSelect: (r: NcmSearchResultDto) => void }) {
  if (results.length === 0) return null;

  return (
    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white">
      {results.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r)}
          className="w-full text-left p-3 hover:bg-indigo-50/60 transition-colors flex items-start justify-between gap-3"
        >
          <div>
            <span className="font-mono text-xs font-bold text-indigo-700">{r.code}</span>
            <p className="text-sm text-slate-700">{r.description}</p>
            {r.requiresReview && <span className="text-[10px] text-amber-600 font-semibold">Requiere revisión de catálogo</span>}
          </div>
          <Badge tone="slate">{REASON_LABEL[r.reason] ?? r.reason}</Badge>
        </button>
      ))}
    </div>
  );
}
