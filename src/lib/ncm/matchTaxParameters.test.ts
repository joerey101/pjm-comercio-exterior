import { describe, expect, it } from 'vitest';
import { matchTaxParameters, type MatchableTaxParameter } from './matchTaxParameters';

const CANDIDATES: MatchableTaxParameter[] = [
  {
    id: 'tp-1',
    normalizedNcmCode: '84713012',
    isActive: true,
    importDuty: 16,
    statisticalRate: 3,
    iva: 10.5,
    ivaAdditional: 10,
    ganancias: 6,
    iibb: 2.5,
    antiDumping: 0,
    otherTax: 0,
  },
  {
    id: 'tp-2-inactive',
    normalizedNcmCode: '61091000',
    isActive: false,
    importDuty: 35,
    statisticalRate: 3,
    iva: 21,
    ivaAdditional: 20,
    ganancias: 6,
    iibb: 2.5,
    antiDumping: 0,
    otherTax: 0,
  },
];

describe('matchTaxParameters', () => {
  it('matches an active row by normalized NCM code, dotted or not', () => {
    expect(matchTaxParameters('8471.30.12', CANDIDATES)?.id).toBe('tp-1');
    expect(matchTaxParameters('84713012', CANDIDATES)?.id).toBe('tp-1');
  });

  it('does not match an inactive row (the "no hay parámetros activos" fallback case)', () => {
    expect(matchTaxParameters('6109.10.00', CANDIDATES)).toBeNull();
  });

  it('returns null when no row matches the code at all', () => {
    expect(matchTaxParameters('9999.99.99', CANDIDATES)).toBeNull();
  });
});
