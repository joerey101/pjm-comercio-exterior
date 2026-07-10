'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateQuoteTerms,
  addQuoteItem,
  removeQuoteItem,
  addQuoteCost,
  removeQuoteCost,
  approveQuote,
  issueQuote,
  cancelQuote,
  setQuoteExchangeRate,
} from '@/app/actions/quotes';
import { Button } from '@/components/ui/Button';
import { inputClass, selectClass, textareaClass } from '@/components/ui/Field';
import { formatMoney } from '@/lib/formatMoney';
import { FORMAL_QUOTE_COST_CATEGORY_LABELS, type FormalQuoteCostCategory } from '@/types/quotes';
import type { FormalQuoteRow, FormalQuoteItemRow, FormalQuoteCostRow } from '@/types/database';

export function QuoteBuilder({
  quote,
  items,
  costs,
  simulationId,
  latestBnaRate,
}: {
  quote: FormalQuoteRow;
  items: FormalQuoteItemRow[];
  costs: FormalQuoteCostRow[];
  simulationId: string;
  latestBnaRate?: { rate: number; date: string } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [paymentTerms, setPaymentTerms] = useState(quote.payment_terms ?? '');
  const [validityDays, setValidityDays] = useState(quote.validity_days);
  const [notes, setNotes] = useState(quote.notes ?? '');
  const [exclusions, setExclusions] = useState(quote.exclusions ?? '');

  const [newItem, setNewItem] = useState({ description: '', ncmCode: '', quantity: '1', unitValue: '0' });
  const [newCost, setNewCost] = useState<{ category: FormalQuoteCostCategory; label: string; amount: string }>({
    category: 'other',
    label: '',
    amount: '0',
  });

  const isDraft = quote.status === 'draft';
  const isApproved = quote.status === 'approved';

  function run(action: () => Promise<{ ok: true } | { error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if ('error' in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Condiciones de pago</label>
          <input className={inputClass} disabled={!isDraft} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Ej: 50% anticipo, 50% contra BL" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Vigencia (días)</label>
          <input type="number" min={1} className={inputClass} disabled={!isDraft} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Notas</label>
          <textarea rows={2} className={textareaClass} disabled={!isDraft} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Exclusiones</label>
          <textarea rows={2} className={textareaClass} disabled={!isDraft} value={exclusions} onChange={(e) => setExclusions(e.target.value)} />
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Tipo de cambio (BNA)</label>
          <p className="text-sm font-semibold text-slate-700 h-10 flex items-center">
            {quote.exchange_rate ? quote.exchange_rate : 'Sin fijar'}
          </p>
        </div>
        {isDraft && latestBnaRate && (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => run(() => setQuoteExchangeRate(quote.id, simulationId, latestBnaRate.rate))}
          >
            Usar último TC BNA ({latestBnaRate.rate}, {new Date(latestBnaRate.date).toLocaleDateString('es-AR')})
          </Button>
        )}
      </div>

      {isDraft && (
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => run(() => updateQuoteTerms(quote.id, simulationId, { paymentTerms, validityDays, notes, exclusions }))}
        >
          Guardar condiciones
        </Button>
      )}

      <div>
        <h3 className="text-xs font-bold text-slate-900 uppercase mb-3">Mercadería</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="py-2 pr-3 text-left">Descripción</th>
                <th className="py-2 pr-3 text-left">NCM</th>
                <th className="py-2 pr-3 text-right">Cant.</th>
                <th className="py-2 pr-3 text-right">V. unitario</th>
                <th className="py-2 pr-3 text-right">Total</th>
                {isDraft && <th className="py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-3">{item.description}</td>
                  <td className="py-2 pr-3">{item.ncm_code || '—'}</td>
                  <td className="py-2 pr-3 text-right">{item.quantity}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(item.unit_value, quote.currency)}</td>
                  <td className="py-2 pr-3 text-right font-semibold">{formatMoney(item.total_value, quote.currency)}</td>
                  {isDraft && (
                    <td className="py-2 text-right">
                      <button type="button" className="text-xs text-rose-600 hover:underline" disabled={isPending} onClick={() => run(() => removeQuoteItem(item.id, quote.id, simulationId))}>
                        Quitar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-slate-400 text-xs">Sin ítems</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isDraft && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
            <input className={inputClass} placeholder="Descripción" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
            <input className={inputClass} placeholder="NCM" value={newItem.ncmCode} onChange={(e) => setNewItem({ ...newItem, ncmCode: e.target.value })} />
            <input type="number" className={inputClass} placeholder="Cantidad" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
            <input type="number" className={inputClass} placeholder="Valor unitario" value={newItem.unitValue} onChange={(e) => setNewItem({ ...newItem, unitValue: e.target.value })} />
            <Button
              type="button"
              variant="secondary"
              disabled={isPending || !newItem.description.trim()}
              onClick={() =>
                run(async () => {
                  const res = await addQuoteItem(quote.id, simulationId, {
                    description: newItem.description,
                    ncmCode: newItem.ncmCode || null,
                    quantity: Number(newItem.quantity) || 0,
                    unitValue: Number(newItem.unitValue) || 0,
                  });
                  if (!('error' in res)) setNewItem({ description: '', ncmCode: '', quantity: '1', unitValue: '0' });
                  return res;
                })
              }
            >
              Agregar
            </Button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-900 uppercase mb-3">Costos comerciales</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="py-2 pr-3 text-left">Categoría</th>
                <th className="py-2 pr-3 text-left">Concepto</th>
                <th className="py-2 pr-3 text-right">Monto</th>
                {isDraft && <th className="py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costs.map((cost) => (
                <tr key={cost.id}>
                  <td className="py-2 pr-3">{FORMAL_QUOTE_COST_CATEGORY_LABELS[cost.category as FormalQuoteCostCategory] ?? cost.category}</td>
                  <td className="py-2 pr-3">{cost.label}</td>
                  <td className="py-2 pr-3 text-right font-semibold">{formatMoney(cost.amount, quote.currency)}</td>
                  {isDraft && (
                    <td className="py-2 text-right">
                      <button type="button" className="text-xs text-rose-600 hover:underline" disabled={isPending} onClick={() => run(() => removeQuoteCost(cost.id, quote.id, simulationId))}>
                        Quitar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {costs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-slate-400 text-xs">Sin costos cargados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isDraft && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <select className={selectClass} value={newCost.category} onChange={(e) => setNewCost({ ...newCost, category: e.target.value as FormalQuoteCostCategory })}>
              {Object.entries(FORMAL_QUOTE_COST_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <input className={inputClass} placeholder="Concepto" value={newCost.label} onChange={(e) => setNewCost({ ...newCost, label: e.target.value })} />
            <input type="number" className={inputClass} placeholder="Monto" value={newCost.amount} onChange={(e) => setNewCost({ ...newCost, amount: e.target.value })} />
            <Button
              type="button"
              variant="secondary"
              disabled={isPending || !newCost.label.trim()}
              onClick={() =>
                run(async () => {
                  const res = await addQuoteCost(quote.id, simulationId, { category: newCost.category, label: newCost.label, amount: Number(newCost.amount) || 0 });
                  if (!('error' in res)) setNewCost({ category: 'other', label: '', amount: '0' });
                  return res;
                })
              }
            >
              Agregar
            </Button>
          </div>
        )}
      </div>

      <div className="bg-indigo-600 text-white rounded-xl p-4 flex justify-between items-center">
        <span className="text-xs font-bold uppercase">Total cotización</span>
        <span className="text-lg font-black">{formatMoney(quote.total, quote.currency)}</span>
      </div>

      {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {isDraft && (
          <>
            <Button type="button" disabled={isPending} onClick={() => run(() => approveQuote(quote.id, simulationId))}>
              Aprobar borrador
            </Button>
            <Button type="button" variant="danger" disabled={isPending} onClick={() => run(() => cancelQuote(quote.id, simulationId))}>
              Cancelar
            </Button>
          </>
        )}
        {isApproved && (
          <>
            <Button type="button" disabled={isPending} onClick={() => run(() => issueQuote(quote.id, simulationId))}>
              Emitir y enviar al cliente
            </Button>
            <Button type="button" variant="danger" disabled={isPending} onClick={() => run(() => cancelQuote(quote.id, simulationId))}>
              Cancelar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
