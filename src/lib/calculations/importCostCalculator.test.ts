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
      fobValue: 15000,
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
      // rates as they'd arrive from an imported tax_parameters row (Sprint 2)
      taxRates: { importDuty: 16, statisticalRate: 3, iva: 10.5, ivaAdditional: 10, ganancias: 6, iibb: 2.5 },
    });

    expect(summary.cif).toBeGreaterThan(15000);
    expect(summary.customsDuty).toBeCloseTo(summary.cif * 0.16);
    expect(summary.vatBase).toBeCloseTo(summary.cif + summary.customsDuty + summary.statisticalRate);
    expect(summary.fiscalCredits).toBeCloseTo(summary.iva + summary.ivaAdditional + summary.ganancias + summary.iibb);
    expect(summary.cashRequired).toBeCloseTo(summary.definitiveCost + summary.fiscalCredits);
    expect(summary.unitCost).toBeCloseTo(summary.cashRequired / 500);
  });

  it('reflects a "no active tax parameters" warning as zeroed tax rates rather than throwing', () => {
    const summary = calculateSimulationSummary({
      fobValue: 1000,
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
      taxRates: { importDuty: 0, statisticalRate: 0, iva: 0, ivaAdditional: 0, ganancias: 0, iibb: 0 },
    });

    expect(summary.customsDuty).toBe(0);
    expect(summary.fiscalCredits).toBe(0);
    expect(summary.cashRequired).toBe(summary.definitiveCost);
  });
});
