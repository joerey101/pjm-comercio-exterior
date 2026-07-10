import Link from 'next/link';
import { formatMoney } from '@/lib/formatMoney';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import type { FormalQuoteStatus } from '@/types/quotes';
import type { FormalQuoteRow } from '@/types/database';

export function QuoteSummaryCard({
  quote,
  pdfHref,
  children,
}: {
  quote: FormalQuoteRow;
  pdfHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 uppercase font-bold">
            {quote.quote_number ? `Cotización ${quote.quote_number}` : 'Borrador de cotización'}
          </p>
          <p className="text-lg font-black text-slate-900">{formatMoney(quote.total, quote.currency)}</p>
        </div>
        <QuoteStatusBadge status={quote.status as FormalQuoteStatus} />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <span className="text-slate-500">Condiciones de pago</span>
        <span className="text-right font-medium text-slate-700">{quote.payment_terms || '—'}</span>
        <span className="text-slate-500">Vigencia</span>
        <span className="text-right font-medium text-slate-700">
          {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('es-AR') : `${quote.validity_days} días desde la emisión`}
        </span>
      </div>

      {quote.notes && <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">{quote.notes}</p>}

      {pdfHref && quote.quote_number && (
        <Link href={pdfHref} className="text-sm font-bold text-indigo-600 hover:underline inline-block">
          Ver PDF de la cotización
        </Link>
      )}

      {children}
    </div>
  );
}
