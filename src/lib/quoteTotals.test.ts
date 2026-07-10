import { describe, expect, it } from 'vitest';
import { computeQuoteTotals } from './quoteTotals';

describe('computeQuoteTotals', () => {
  it('is all zero with no items or costs', () => {
    expect(computeQuoteTotals([], [])).toEqual({ subtotal: 0, taxesTotal: 0, total: 0 });
  });

  it('sums item lines as subtotal', () => {
    const result = computeQuoteTotals(
      [
        { quantity: 2, unitValue: 100 },
        { quantity: 1, unitValue: 50 },
      ],
      []
    );
    expect(result.subtotal).toBe(250);
    expect(result.total).toBe(250);
  });

  it('isolates the taxes category into taxesTotal', () => {
    const result = computeQuoteTotals(
      [{ quantity: 1, unitValue: 1000 }],
      [
        { category: 'taxes', amount: 200 },
        { category: 'customs', amount: 50 },
        { category: 'logistics', amount: 30 },
      ]
    );
    expect(result.taxesTotal).toBe(200);
    expect(result.total).toBe(1280);
  });

  it('includes every cost category in total, not just taxes', () => {
    const result = computeQuoteTotals(
      [],
      [
        { category: 'fees', amount: 100 },
        { category: 'other', amount: 25 },
      ]
    );
    expect(result.taxesTotal).toBe(0);
    expect(result.total).toBe(125);
  });
});
