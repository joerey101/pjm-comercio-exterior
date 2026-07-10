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
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitValue, 0);
  const taxesTotal = costs.filter((c) => c.category === 'taxes').reduce((sum, c) => sum + c.amount, 0);
  const costsTotal = costs.reduce((sum, c) => sum + c.amount, 0);
  const total = subtotal + costsTotal;
  return { subtotal, taxesTotal, total };
}
