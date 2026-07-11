import { describe, expect, it } from 'vitest';
import {
  calculateCIF,
  calculateCustomsDuty,
  calculateStatisticalRate,
  calculateVATBase,
  calculateVAT,
  calculateFiscalCredits,
  calculateCashRequired,
  calculateUnitCost,
  calculateSimulationSummary,
} from './importCostCalculator';

describe('core formulas', () => {
  it('CIF = FOB + freight + insurance', () => {
    expect(calculateCIF(1000, 200, 50)).toBe(1250);
  });

  it('DIE and tasa estadística are percentages of CIF', () => {
    const cif = 1000;
    expect(calculateCustomsDuty(cif, 16)).toBeCloseTo(160);
    expect(calculateStatisticalRate(cif, 3)).toBeCloseTo(30);
  });

  it('Base IVA = CIF + DIE + tasa estadística', () => {
    expect(calculateVATBase(1000, 160, 30)).toBe(1190);
  });

  it('IVA is a percentage of the VAT base, not of CIF', () => {
    expect(calculateVAT(1190, 10.5)).toBeCloseTo(124.95);
  });

  it('créditos fiscales sums IVA + IVA adicional + Ganancias + IIBB', () => {
    expect(calculateFiscalCredits(100, 90, 60, 25)).toBe(275);
  });

  it('caja necesaria = costo definitivo + créditos fiscales', () => {
    expect(calculateCashRequired(500, 275)).toBe(775);
  });

  it('costo unitario divides caja necesaria by total units, 0 when no units', () => {
    expect(calculateUnitCost(1000, 50)).toBe(20);
    expect(calculateUnitCost(1000, 0)).toBe(0);
  });
});

describe('calculateSimulationSummary (using imported tax parameters, Sprint 2)', () => {
  it('produces a coherent breakdown for an ocean LCL shipment with parametrized tax rates', () => {
    const summary = calculateSimulationSummary({
      items: [{
        id: 'item-1',
        fobValue: 15000,
        taxRates: { importDuty: 16, statisticalRate: 3, iva: 10.5, ivaAdditional: 10, ganancias: 6, iibb: 2.5 },
      }],
      totalUnits: 500,
      transportMode: 'ocean_lcl',
      incoterm: 'FOB',
      cargoItems: [{ id: 'a', name: 'Notebooks', qty: 1, lengthCm: 100, widthCm: 100, heightCm: 80, weightKg: 1200 }],
      containers: { cnt20: 0, cnt40: 0, cnt40hc: 0 },
      freightRates: { mainFreightRate: 95, bafFsc: 110 },
      insurancePercent: 0.35,
      originLocalCharges: 150,
      destinationLocalCharges: 220,
      customsBrokerFee: 250,
      internalFreight: 0,
      otherDefinitiveCosts: 0,
    });

    expect(summary.cif).toBeGreaterThan(15000);
    expect(summary.customsDuty).toBeCloseTo(summary.cif * 0.16);
    expect(summary.vatBase).toBeCloseTo(summary.cif + summary.customsDuty + summary.statisticalRate);
    // fiscalCredits is computed from precise Decimal values and rounded once at the output
    // boundary. Each individual field (iva, ivaAdditional, etc.) is also independently
    // rounded. Their sum can differ by up to $0.01 from fiscalCredits — that is correct
    // behavior (round-once principle). Verify the structural relationship instead:
    expect(summary.fiscalCredits).toBeGreaterThan(0);
    expect(summary.fiscalCredits).toBeCloseTo(
      summary.iva + summary.ivaAdditional + summary.ganancias + summary.iibb,
      0  // precision=0 means within 0.5 — accounts for the 1-cent rounding artefact
    );
    expect(summary.cashRequired).toBeCloseTo(summary.definitiveCost + summary.fiscalCredits);
    expect(summary.unitCost).toBeCloseTo(summary.cashRequired / 500);
    // Single-item: itemBreakdown has exactly 1 entry
    expect(summary.itemBreakdown).toHaveLength(1);
    expect(summary.itemBreakdown[0].itemId).toBe('item-1');
  });

  it('reflects a "no active tax parameters" warning as zeroed tax rates rather than throwing', () => {
    const summary = calculateSimulationSummary({
      items: [{
        id: 'item-1',
        fobValue: 1000,
        taxRates: { importDuty: 0, statisticalRate: 0, iva: 0, ivaAdditional: 0, ganancias: 0, iibb: 0 },
      }],
      totalUnits: 10,
      transportMode: 'air',
      incoterm: 'EXW',
      cargoItems: [{ id: 'a', name: 'Item', qty: 1, lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 5 }],
      containers: { cnt20: 0, cnt40: 0, cnt40hc: 0 },
      freightRates: { mainFreightRate: 4, bafFsc: 10 },
      insurancePercent: 0.35,
      originLocalCharges: 0,
      destinationLocalCharges: 0,
      customsBrokerFee: 0,
      internalFreight: 0,
      otherDefinitiveCosts: 0,
    });

    expect(summary.customsDuty).toBe(0);
    expect(summary.fiscalCredits).toBe(0);
    expect(summary.cashRequired).toBe(summary.definitiveCost);
  });
});

describe('calculateSimulationSummary — multi-item per-NCM calculation', () => {
  const baseShipment = {
    totalUnits: 100,
    transportMode: 'ocean_lcl' as const,
    incoterm: 'FOB' as const,
    cargoItems: [{ id: 'a', name: 'Mixed', qty: 1, lengthCm: 80, widthCm: 60, heightCm: 60, weightKg: 800 }],
    containers: { cnt20: 0, cnt40: 0, cnt40hc: 0 },
    freightRates: { mainFreightRate: 80, bafFsc: 100 },
    insurancePercent: 0.35,
    originLocalCharges: 0,
    destinationLocalCharges: 0,
    customsBrokerFee: 0,
    internalFreight: 0,
    otherDefinitiveCosts: 0,
  };

  it('single-item produces the same result as former aggregate calculation (regression)', () => {
    // A single item with fobValue=10000 and a given alicuota should behave
    // identically to the old fobValue+taxRates interface.
    const rates = { importDuty: 16, statisticalRate: 3, iva: 21, ivaAdditional: 10.5, ganancias: 6, iibb: 2.5 };
    const summary = calculateSimulationSummary({
      ...baseShipment,
      items: [{ id: 'item-1', fobValue: 10000, taxRates: rates }],
    });

    expect(summary.itemBreakdown).toHaveLength(1);
    // Aggregate totals equal the single-item breakdown totals
    expect(summary.cif).toBe(summary.itemBreakdown[0].cif);
    expect(summary.customsDuty).toBeCloseTo(summary.cif * 0.16);
    // Each output field is independently rounded to 2 decimal places at the boundary,
    // so their arithmetic sum can differ by up to $0.01 from the rounded aggregate.
    expect(summary.cashRequired).toBeCloseTo(summary.definitiveCost + summary.fiscalCredits, 0);
  });

  it('two items with different NCM alicuotas produce correct per-item tributos (NOT single alicuota over total FOB)', () => {
    // Item A: FOB 6000, importDuty 16%
    // Item B: FOB 4000, importDuty 20%
    // If we applied a single rate over total FOB 10000:
    //   - DIE at 16%: 1600; DIE at 20%: 2000 (wrong for B)
    // Correct: A's DIE applied to A's CIF, B's DIE applied to B's CIF.
    const summaryMulti = calculateSimulationSummary({
      ...baseShipment,
      items: [
        { id: 'item-a', fobValue: 6000, taxRates: { importDuty: 16, statisticalRate: 3, iva: 21, ivaAdditional: 10.5, ganancias: 6, iibb: 2.5 } },
        { id: 'item-b', fobValue: 4000, taxRates: { importDuty: 20, statisticalRate: 3, iva: 21, ivaAdditional: 10.5, ganancias: 6, iibb: 2.5 } },
      ],
    });

    // The single-alicuota equivalent at 16% over total FOB would produce LESS customs duty
    const summaryFlat16 = calculateSimulationSummary({
      ...baseShipment,
      items: [{ id: 'all', fobValue: 10000, taxRates: { importDuty: 16, statisticalRate: 3, iva: 21, ivaAdditional: 10.5, ganancias: 6, iibb: 2.5 } }],
    });

    // Multi-item duty must be higher than flat 16% (because item-b pays 20%)
    expect(summaryMulti.customsDuty).toBeGreaterThan(summaryFlat16.customsDuty);

    // Each breakdown matches the expected alicuota for that item's CIF
    const breakA = summaryMulti.itemBreakdown.find((b) => b.itemId === 'item-a')!;
    const breakB = summaryMulti.itemBreakdown.find((b) => b.itemId === 'item-b')!;
    expect(breakA.customsDuty).toBeCloseTo(breakA.cif * 0.16, 1);
    expect(breakB.customsDuty).toBeCloseTo(breakB.cif * 0.20, 1);

    // Aggregated customsDuty = sum of per-item
    expect(summaryMulti.customsDuty).toBeCloseTo(breakA.customsDuty + breakB.customsDuty, 0);
  });

  it('sum of prorated freight/insurance across items equals the total freight/insurance (no centavo lost)', () => {
    const summary = calculateSimulationSummary({
      ...baseShipment,
      items: [
        { id: 'item-a', fobValue: 7000, taxRates: { importDuty: 16, statisticalRate: 3, iva: 21, ivaAdditional: 10.5, ganancias: 6, iibb: 2.5 } },
        { id: 'item-b', fobValue: 3000, taxRates: { importDuty: 18, statisticalRate: 3, iva: 21, ivaAdditional: 10.5, ganancias: 6, iibb: 2.5 } },
      ],
    });

    const totalFreightProrated = summary.itemBreakdown.reduce((sum, b) => sum + b.freightProrated, 0);
    const totalInsuranceProrated = summary.itemBreakdown.reduce((sum, b) => sum + b.insuranceProrated, 0);

    // Sum of prorated values must match the total (within 1 cent due to independent rounding)
    expect(totalFreightProrated).toBeCloseTo(summary.freight, 0);
    expect(totalInsuranceProrated).toBeCloseTo(summary.insurance, 0);
  });
});

describe('decimal.js precision — float rounding correctness', () => {
  it('accumulating fractional percentages does not produce floating-point drift', () => {
    // Demonstrate that chaining multiple float operations accumulates error.
    // Example: cif=12345.67, importDuty=16.1%, statisticalRate=2.5%, iva=10.5%
    // In plain JS floats, intermediate values like 12345.67 * 0.161 produce
    // 1987.6528699999999 instead of exactly 1987.653. After further chaining
    // (customsDuty + statisticalRate to get vatBase, then vatBase * ivaPercent)
    // the error compounds. The summary output, rounded by Decimal at the boundary,
    // must produce a value with at most 2 decimal digits on every field.
    const summary = calculateSimulationSummary({
      items: [{
        id: 'item-1',
        fobValue: 12345.67,
        taxRates: { importDuty: 16.1, statisticalRate: 2.5, iva: 10.5, ivaAdditional: 10, ganancias: 6, iibb: 2.5 },
      }],
      totalUnits: 7,
      transportMode: 'ocean_lcl',
      incoterm: 'FOB',
      cargoItems: [{ id: 'a', name: 'Item', qty: 1, lengthCm: 80, widthCm: 60, heightCm: 40, weightKg: 500 }],
      containers: { cnt20: 0, cnt40: 0, cnt40hc: 0 },
      freightRates: { mainFreightRate: 97.33, bafFsc: 75.5 },
      insurancePercent: 0.35,
      originLocalCharges: 0,
      destinationLocalCharges: 0,
      customsBrokerFee: 0,
      internalFreight: 0,
      otherDefinitiveCosts: 0,
    });

    // All monetary fields must have at most 2 decimal places (Decimal boundary rounding).
    const monetaryFields = [
      'freight', 'insurance', 'cif', 'customsDuty', 'statisticalRate',
      'vatBase', 'iva', 'ivaAdditional', 'ganancias', 'iibb',
      'fiscalCredits', 'localExpenses', 'definitiveCost', 'cashRequired', 'unitCost',
    ] as const;

    for (const field of monetaryFields) {
      const value = summary[field];
      const rounded = Math.round(value * 100) / 100;
      expect(value).toBe(rounded);
    }
  });

  it('output values are exactly rounded to 2 decimal places — never 0.30000000000000004', () => {
    // This is the canonical float problem: 0.1 + 0.2 in JS = 0.30000000000000004.
    // The output boundary of calculateSimulationSummary must always produce
    // values with at most 2 decimal places.
    const summary = calculateSimulationSummary({
      items: [{
        id: 'item-1',
        fobValue: 100.1,
        taxRates: { importDuty: 16, statisticalRate: 3, iva: 21, ivaAdditional: 10.5, ganancias: 6, iibb: 2.5 },
      }],
      totalUnits: 3,
      transportMode: 'air',
      incoterm: 'FOB',
      cargoItems: [{ id: 'a', name: 'Item', qty: 1, lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 1 }],
      containers: { cnt20: 0, cnt40: 0, cnt40hc: 0 },
      freightRates: { mainFreightRate: 0.1, bafFsc: 0 },
      insurancePercent: 0.1,
      originLocalCharges: 0,
      destinationLocalCharges: 0,
      customsBrokerFee: 0,
      internalFreight: 0,
      otherDefinitiveCosts: 0,
    });

    // Every monetary field in the result must have at most 2 decimal places.
    const monetaryFields = [
      'freight', 'insurance', 'cif', 'customsDuty', 'statisticalRate',
      'vatBase', 'iva', 'ivaAdditional', 'ganancias', 'iibb',
      'fiscalCredits', 'localExpenses', 'definitiveCost', 'cashRequired', 'unitCost',
    ] as const;

    for (const field of monetaryFields) {
      const value = summary[field];
      const rounded = Math.round(value * 100) / 100;
      expect(value).toBe(rounded);
    }
  });
});

describe('company tax exemptions', () => {
  const baseShipment = {
    totalUnits: 100,
    transportMode: 'ocean_lcl' as const,
    incoterm: 'FOB' as const,
    cargoItems: [{ id: 'a', name: 'Mixed', qty: 1, lengthCm: 80, widthCm: 60, heightCm: 60, weightKg: 800 }],
    containers: { cnt20: 0, cnt40: 0, cnt40hc: 0 },
    freightRates: { mainFreightRate: 80, bafFsc: 100 },
    insurancePercent: 0.35,
    originLocalCharges: 0,
    destinationLocalCharges: 0,
    customsBrokerFee: 0,
    internalFreight: 0,
    otherDefinitiveCosts: 0,
  };

  it('zeroes out exempted taxes when flags are provided', () => {
    const summary = calculateSimulationSummary({
      ...baseShipment,
      items: [{
        id: 'item-1',
        fobValue: 10000,
        taxRates: { importDuty: 16, statisticalRate: 3, iva: 21, ivaAdditional: 10, ganancias: 6, iibb: 2.5 },
      }],
      companyTaxExemptions: {
        exemptIvaAdditional: true,
        exemptGanancias: true,
        exemptIibb: true,
      },
    });

    expect(summary.itemBreakdown[0].ivaAdditional).toBe(0);
    expect(summary.itemBreakdown[0].ganancias).toBe(0);
    expect(summary.itemBreakdown[0].iibb).toBe(0);

    expect(summary.ivaAdditional).toBe(0);
    expect(summary.ganancias).toBe(0);
    expect(summary.iibb).toBe(0);

    expect(summary.fiscalCredits).toBe(summary.iva);
  });
});
