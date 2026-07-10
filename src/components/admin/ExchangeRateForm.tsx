'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addExchangeRate } from '@/app/actions/integrations';
import { Button } from '@/components/ui/Button';
import { inputClass } from '@/components/ui/Field';

export function ExchangeRateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    rateDate: new Date().toISOString().slice(0, 10),
    currency: 'USD',
    buyRate: '',
    sellRate: '',
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input type="date" className={inputClass} value={form.rateDate} onChange={(e) => setForm({ ...form, rateDate: e.target.value })} />
        <input className={inputClass} placeholder="Moneda" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        <input type="number" step="0.01" className={inputClass} placeholder="Compra" value={form.buyRate} onChange={(e) => setForm({ ...form, buyRate: e.target.value })} />
        <input type="number" step="0.01" className={inputClass} placeholder="Venta" value={form.sellRate} onChange={(e) => setForm({ ...form, sellRate: e.target.value })} />
      </div>
      {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
      <Button
        type="button"
        variant="secondary"
        disabled={isPending || !form.buyRate || !form.sellRate}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await addExchangeRate({
              rateDate: form.rateDate,
              currency: form.currency,
              buyRate: Number(form.buyRate),
              sellRate: Number(form.sellRate),
            });
            if ('error' in res) {
              setError(res.error);
              return;
            }
            setForm({ ...form, buyRate: '', sellRate: '' });
            router.refresh();
          })
        }
      >
        Cargar tipo de cambio
      </Button>
    </div>
  );
}
