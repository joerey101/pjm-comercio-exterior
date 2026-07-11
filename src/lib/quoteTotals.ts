import Decimal from 'decimal.js';

export interface QuoteItemLike {
  quantity: number;
  unitValue: number;
}


export interface QuoteCostLike {
  amount: number;
}

export interface QuoteTotals {
  subtotal: number;
  taxesTotal: number;
  total: number;
}

/**
 * subtotal = sum of item lines (goods value); taxesTotal = sum of cost lines
 * tagged 'taxes'; total = subtotal + every cost line (taxes, customs,
 * logistics, fees, other). Kept separate from taxesTotal because the UI
 * shows "Impuestos" as its own figure inside the cost breakdown.
 */
export function computeQuoteTotals(
  items: QuoteItemLike[],
  costs: (QuoteCostLike & { category: string })[]
): QuoteTotals {
  const subtotal = items
    .reduce((sum, item) => sum.plus(new Decimal(item.quantity).times(item.unitValue)), new Decimal(0))
    .toNumber();
  const taxesTotal = costs
    .filter((c) => c.category === 'taxes')
    .reduce((sum, c) => sum.plus(c.amount), new Decimal(0))
    .toNumber();
  const costsTotal = costs.reduce((sum, c) => sum.plus(c.amount), new Decimal(0)).toNumber();
  const total = new Decimal(subtotal).plus(costsTotal).toNumber();
  return { subtotal, taxesTotal, total };
}
