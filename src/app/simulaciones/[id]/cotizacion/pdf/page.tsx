import { notFound } from 'next/navigation';
import { Globe2 } from 'lucide-react';
import { requireUser, getCurrentProfile } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/formatMoney';
import { FORMAL_QUOTE_COST_CATEGORY_LABELS, type FormalQuoteCostCategory } from '@/types/quotes';
import type { SimulationRow, CompanyRow, FormalQuoteRow, FormalQuoteItemRow, FormalQuoteCostRow } from '@/types/database';
import { PrintButton } from '../../pdf/PrintButton';

export default async function FormalQuotePdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: simulation } = await supabase.from('simulations').select('*').eq('id', id).maybeSingle<SimulationRow>();
  if (!simulation) notFound();
  const isOwner = simulation.user_id === user.id;
  const isAdmin = profile?.role === 'admin_pjm';
  if (!isOwner && !isAdmin) notFound();

  const { data: quote } = await supabase
    .from('formal_quotes')
    .select('*')
    .eq('simulation_id', id)
    .not('quote_number', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<FormalQuoteRow>();
  if (!quote) notFound();

  const { data: company } = simulation.company_id
    ? await supabase.from('companies').select('*').eq('id', simulation.company_id).maybeSingle<CompanyRow>()
    : { data: null };

  const [{ data: items }, { data: costs }] = await Promise.all([
    supabase.from('formal_quote_items').select('*').eq('formal_quote_id', quote.id).order('sort_order').returns<FormalQuoteItemRow[]>(),
    supabase.from('formal_quote_costs').select('*').eq('formal_quote_id', quote.id).order('sort_order').returns<FormalQuoteCostRow[]>(),
  ]);

  const row = (label: string, value: string) => (
    <div className="flex justify-between py-1 text-sm border-b border-slate-100">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 w-full print-full-width">
      <div className="flex justify-end mb-6 no-print">
        <PrintButton />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg block leading-none">PJM Comercio Exterior</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Cotización comercial formal</span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              Cotización N° <span className="font-mono">{quote.quote_number}</span>
            </p>
            <p>Emitida: {quote.issued_at ? new Date(quote.issued_at).toLocaleDateString('es-AR') : '—'}</p>
            <p>Vigente hasta: {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('es-AR') : '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Datos del cliente</h3>
            {row('Nombre', profile?.full_name || '—')}
            {row('Email', profile?.email || '—')}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Datos de la empresa</h3>
            {row('Razón social', company?.business_name || '—')}
            {row('CUIT', company?.cuit || '—')}
            {row('Domicilio', company?.address || '—')}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Mercadería</h3>
          <table className="w-full text-xs">
            <thead className="text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="text-left py-1">Descripción</th>
                <th className="text-left py-1">NCM</th>
                <th className="text-right py-1">Cant.</th>
                <th className="text-right py-1">V. unitario</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-1.5">{item.description}</td>
                  <td className="py-1.5">{item.ncm_code || '—'}</td>
                  <td className="py-1.5 text-right">{item.quantity}</td>
                  <td className="py-1.5 text-right">{formatMoney(item.unit_value, quote.currency)}</td>
                  <td className="py-1.5 text-right">{formatMoney(item.total_value, quote.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Costos comerciales</h3>
          <table className="w-full text-xs">
            <thead className="text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="text-left py-1">Categoría</th>
                <th className="text-left py-1">Concepto</th>
                <th className="text-right py-1">Monto</th>
              </tr>
            </thead>
            <tbody>
              {(costs ?? []).map((cost) => (
                <tr key={cost.id} className="border-b border-slate-100">
                  <td className="py-1.5">{FORMAL_QUOTE_COST_CATEGORY_LABELS[cost.category as FormalQuoteCostCategory] ?? cost.category}</td>
                  <td className="py-1.5">{cost.label}</td>
                  <td className="py-1.5 text-right">{formatMoney(cost.amount, quote.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-indigo-600 text-white rounded-xl p-4 flex justify-between items-center">
          <span className="text-xs font-bold uppercase">Total cotización</span>
          <span className="text-lg font-black">{formatMoney(quote.total, quote.currency)}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-8 text-sm">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Condiciones de pago</h3>
            <p className="text-slate-700">{quote.payment_terms || 'A convenir con PJM Comercio Exterior.'}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase mb-2">Exclusiones</h3>
            <p className="text-slate-700">{quote.exclusions || 'Sin exclusiones adicionales.'}</p>
          </div>
        </div>

        {quote.notes && (
          <div className="text-xs text-slate-500 border-t border-slate-200 pt-4">
            <strong>Notas:</strong> {quote.notes}
          </div>
        )}

        <div className="text-xs text-slate-500 space-y-2 border-t border-slate-200 pt-4">
          <p className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
            Esta cotización es una oferta comercial formal de PJM Comercio Exterior, válida por el período indicado.
            Su aceptación implica la conformidad con las condiciones aquí detalladas.
          </p>
        </div>
      </div>
    </div>
  );
}
