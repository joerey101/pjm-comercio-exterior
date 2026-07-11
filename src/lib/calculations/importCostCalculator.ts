/**
 * Import cost calculation engine for the PJM Cotizador Inteligente.
 *
 * This module is a direct, tested port of the calculation logic from the
 * original "Cotizador de Carga Internacional" HTML prototype (CBM / chargeable
 * weight / freight-by-mode / insurance / incoterm responsibility), extended
 * with the Argentina nationalization formulas (CIF, DIE, tasa estadística,
 * IVA, IVA adicional, percepciones, créditos fiscales, caja necesaria).
 *
 * All functions are pure — no DOM, no I/O — so they can be unit tested and
 * reused identically on the server (Server Actions) and the client (live
 * preview while the user fills the wizard).
 *
 * Tax/percentage rate parameters are expressed as percentages (e.g. 16 for
 * 16%), matching the original prototype's input convention.
 */

import Decimal from 'decimal.js';
import type { CargoItem, ContainerSelection, TransportMode } from '@/types/logistics';
import type { Incoterm } from '@/types/simulation';

// Configure Decimal for monetary precision: 20 significant digits, ROUND_HALF_UP.
// Rounding to 2 decimal places happens ONLY at the output boundary of
// calculateSimulationSummary — never in intermediate calculations.
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ---------------------------------------------------------------------------
// Cargo / chargeable weight
// ---------------------------------------------------------------------------

/** CBM-to-kg conversion factor per transport mode, as used by the original calculator. */
export const VOLUMETRIC_FACTOR: Record<Exclude<TransportMode, 'ocean_fcl'>, number> = {
  ocean_lcl: 1000,
  air: 167,
  road: 333,
};

export const CONTAINER_CAPACITY_CBM: Record<keyof ContainerSelection, number> = {
  cnt20: 33,
  cnt40: 67,
  cnt40hc: 76,
};

export const CONTAINER_CAPACITY_KG: Record<keyof ContainerSelection, number> = {
  cnt20: 28000,
  cnt40: 26000,
  cnt40hc: 26000,
};

export function cargoItemCbm(item: Pick<CargoItem, 'lengthCm' | 'widthCm' | 'heightCm' | 'qty'>): number {
  return ((item.lengthCm * item.widthCm * item.heightCm) / 1_000_000) * item.qty;
}

export function cargoItemWeight(item: Pick<CargoItem, 'weightKg' | 'qty'>): number {
  return item.weightKg * item.qty;
}

export interface CargoSummary {
  totalGrossWeightKg: number;
  totalVolumeCbm: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
}

export function calculateCargoSummary(
  transportMode: TransportMode,
  cargoItems: CargoItem[],
  containers: ContainerSelection
): CargoSummary {
  if (transportMode === 'ocean_fcl') {
    const totalVolumeCbm =
      containers.cnt20 * CONTAINER_CAPACITY_CBM.cnt20 +
      containers.cnt40 * CONTAINER_CAPACITY_CBM.cnt40 +
      containers.cnt40hc * CONTAINER_CAPACITY_CBM.cnt40hc;
    const totalGrossWeightKg =
      containers.cnt20 * CONTAINER_CAPACITY_KG.cnt20 +
      containers.cnt40 * CONTAINER_CAPACITY_KG.cnt40 +
      containers.cnt40hc * CONTAINER_CAPACITY_KG.cnt40hc;

    return {
      totalGrossWeightKg,
      totalVolumeCbm,
      volumetricWeightKg: 0,
      // FCL charges by container, not by chargeable weight, but we still expose
      // the container-equivalent CBM so summary cards have something to show.
      chargeableWeightKg: totalVolumeCbm,
    };
  }

  const totalGrossWeightKg = cargoItems.reduce((sum, item) => sum + cargoItemWeight(item), 0);
  const totalVolumeCbm = cargoItems.reduce((sum, item) => sum + cargoItemCbm(item), 0);
  const factor = VOLUMETRIC_FACTOR[transportMode];
  const volumetricWeightKg = totalVolumeCbm * factor;
  const chargeableWeightKg = Math.max(totalGrossWeightKg, volumetricWeightKg);

  return { totalGrossWeightKg, totalVolumeCbm, volumetricWeightKg, chargeableWeightKg };
}

// ---------------------------------------------------------------------------
// International freight & insurance
// ---------------------------------------------------------------------------

export interface FreightRates {
  /** USD per CBM (ocean LCL) or per chargeable kg (air/road). Ignored for FCL. */
  mainFreightRate: number;
  /** Flat BAF/FSC fuel surcharge in USD. */
  bafFsc: number;
  /** USD per-container rate, only used when transportMode === 'ocean_fcl'. */
  fclRates?: { cnt20: number; cnt40: number; cnt40hc: number };
}

export function calculateInternationalFreight(
  transportMode: TransportMode,
  cargo: CargoSummary,
  containers: ContainerSelection,
  rates: FreightRates
): number {
  if (transportMode === 'ocean_fcl') {
    const fcl = rates.fclRates ?? { cnt20: 0, cnt40: 0, cnt40hc: 0 };
    return (
      containers.cnt20 * fcl.cnt20 +
      containers.cnt40 * fcl.cnt40 +
      containers.cnt40hc * fcl.cnt40hc
    );
  }
  if (transportMode === 'ocean_lcl') {
    return cargo.totalVolumeCbm * rates.mainFreightRate;
  }
  // air or road: rate is per chargeable kg
  return cargo.chargeableWeightKg * rates.mainFreightRate;
}

/** Insurance premium in USD. Minimum flat premium of 50 USD, as in the original prototype. */
export function calculateInsurance(fobValue: number, freight: number, insurancePercent: number): number {
  const insurance = new Decimal(fobValue).plus(freight).times(new Decimal(insurancePercent).dividedBy(100));
  return Decimal.max(insurance, 50).toNumber();
}

// ---------------------------------------------------------------------------
// Incoterm cost responsibility (who pays what leg of the journey)
// ---------------------------------------------------------------------------

export interface IncotermResponsibility {
  buyerPaysOriginLocals: boolean;
  buyerPaysFreight: boolean;
  buyerPaysDestinationLocals: boolean;
  buyerPaysInsurance: boolean;
  buyerPaysDuties: boolean;
  sellerCoversLabel: string;
  buyerCoversLabel: string;
}

export function getIncotermResponsibility(incoterm: Incoterm): IncotermResponsibility {
  switch (incoterm) {
    case 'EXW':
      return {
        buyerPaysOriginLocals: true,
        buyerPaysFreight: true,
        buyerPaysDestinationLocals: true,
        buyerPaysInsurance: true,
        buyerPaysDuties: true,
        sellerCoversLabel: 'Ninguno (EXW)',
        buyerCoversLabel: 'Flete + Gastos + Impuestos',
      };
    case 'FOB':
      return {
        buyerPaysOriginLocals: false,
        buyerPaysFreight: true,
        buyerPaysDestinationLocals: true,
        buyerPaysInsurance: true,
        buyerPaysDuties: true,
        sellerCoversLabel: 'Gastos de origen',
        buyerCoversLabel: 'Flete + Destino + Impuestos',
      };
    case 'CFR':
      return {
        buyerPaysOriginLocals: false,
        buyerPaysFreight: false,
        buyerPaysDestinationLocals: true,
        buyerPaysInsurance: true,
        buyerPaysDuties: true,
        sellerCoversLabel: 'Flete + Gastos de origen',
        buyerCoversLabel: 'Seguro + Aduana + Impuestos',
      };
    case 'CIF':
      return {
        buyerPaysOriginLocals: false,
        buyerPaysFreight: false,
        buyerPaysDestinationLocals: true,
        buyerPaysInsurance: false,
        buyerPaysDuties: true,
        sellerCoversLabel: 'Flete + Seguro + Origen',
        buyerCoversLabel: 'Aduana + Impuestos',
      };
    case 'DAP':
      return {
        buyerPaysOriginLocals: false,
        buyerPaysFreight: false,
        buyerPaysDestinationLocals: false,
        buyerPaysInsurance: false,
        buyerPaysDuties: true,
        sellerCoversLabel: 'DAP - Logística integral',
        buyerCoversLabel: 'Solo tributos de aduana',
      };
    case 'DDP':
      return {
        buyerPaysOriginLocals: false,
        buyerPaysFreight: false,
        buyerPaysDestinationLocals: false,
        buyerPaysInsurance: false,
        buyerPaysDuties: false,
        sellerCoversLabel: 'Todo incluido (DDP)',
        buyerCoversLabel: 'Sin costos extra',
      };
  }
}

// ---------------------------------------------------------------------------
// Argentina nationalization tax formulas
// ---------------------------------------------------------------------------

/** CIF = FOB + flete internacional + seguro */
export function calculateCIF(fobValue: number, freight: number, insurance: number): number {
  return new Decimal(fobValue).plus(freight).plus(insurance).toNumber();
}

/** DIE = CIF * derecho_importacion */
export function calculateCustomsDuty(cif: number, importDutyPercent: number): number {
  return new Decimal(cif).times(new Decimal(importDutyPercent).dividedBy(100)).toNumber();
}

/** Tasa estadística = CIF * tasa_estadistica */
export function calculateStatisticalRate(cif: number, statisticalRatePercent: number): number {
  return new Decimal(cif).times(new Decimal(statisticalRatePercent).dividedBy(100)).toNumber();
}

/** Base IVA = CIF + DIE + tasa_estadistica */
export function calculateVATBase(cif: number, customsDuty: number, statisticalRate: number): number {
  return new Decimal(cif).plus(customsDuty).plus(statisticalRate).toNumber();
}

/** IVA = Base IVA * alicuota_iva */
export function calculateVAT(vatBase: number, ivaPercent: number): number {
  return new Decimal(vatBase).times(new Decimal(ivaPercent).dividedBy(100)).toNumber();
}

/** IVA adicional = Base IVA * iva_adicional */
export function calculateVATAdditional(vatBase: number, ivaAdditionalPercent: number): number {
  return new Decimal(vatBase).times(new Decimal(ivaAdditionalPercent).dividedBy(100)).toNumber();
}

/** Ganancias = Base IVA * percepcion_ganancias */
export function calculateGananciasPerception(vatBase: number, gananciasPercent: number): number {
  return new Decimal(vatBase).times(new Decimal(gananciasPercent).dividedBy(100)).toNumber();
}

/** IIBB = Base IVA * percepcion_iibb */
export function calculateIIBBPerception(vatBase: number, iibbPercent: number): number {
  return new Decimal(vatBase).times(new Decimal(iibbPercent).dividedBy(100)).toNumber();
}

/** Créditos fiscales = IVA + IVA adicional + Ganancias + IIBB */
export function calculateFiscalCredits(iva: number, ivaAdditional: number, ganancias: number, iibb: number): number {
  return new Decimal(iva).plus(ivaAdditional).plus(ganancias).plus(iibb).toNumber();
}

export interface DefinitiveCostInput {
  freight: number;
  insurance: number;
  localExpenses: number;
  customsDuty: number;
  statisticalRate: number;
  customsBrokerFee: number;
  internalFreight: number;
  otherDefinitiveCosts: number;
}

/**
 * Costo definitivo = flete + seguro + gastos locales + DIE + tasa estadística
 * + despacho + flete interno + otros costos definitivos
 */
export function calculateDefinitiveCost(input: DefinitiveCostInput): number {
  return new Decimal(input.freight)
    .plus(input.insurance)
    .plus(input.localExpenses)
    .plus(input.customsDuty)
    .plus(input.statisticalRate)
    .plus(input.customsBrokerFee)
    .plus(input.internalFreight)
    .plus(input.otherDefinitiveCosts)
    .toNumber();
}

/** Caja necesaria = costo definitivo + créditos fiscales */
export function calculateCashRequired(definitiveCost: number, fiscalCredits: number): number {
  return new Decimal(definitiveCost).plus(fiscalCredits).toNumber();
}

/** Costo unitario = caja necesaria / cantidad de unidades */
export function calculateUnitCost(cashRequired: number, totalUnits: number): number {
  if (!totalUnits || totalUnits <= 0) return 0;
  return new Decimal(cashRequired).dividedBy(totalUnits).toNumber();
}

// ---------------------------------------------------------------------------
// Full simulation summary (aggregate entry point used by the wizard/API)
// ---------------------------------------------------------------------------

/**
 * Input for a single product item in a simulation.
 * Each item carries its own FOB value and NCM-specific tax rates so that
 * multi-item simulations can apply the correct alícuota per NCM code.
 */
export interface SimulationItemInput {
  /** Item identifier for traceability (maps to simulation_items.id). */
  id: string;
  /** Total FOB value of this item (quantity × unit_value). */
  fobValue: number;
  /**
   * NCM-specific tax rates for this item, expressed as percentages
   * (e.g. 16 for 16%). Source: tax_parameters row matched to the item's NCM.
   */
  taxRates: {
    importDuty: number;
    statisticalRate: number;
    iva: number;
    ivaAdditional: number;
    ganancias: number;
    iibb: number;
  };
}

/** Per-item tax breakdown — exposed in the result for future UI use. */
export interface SimulationItemBreakdown {
  itemId: string;
  fobValue: number;
  /** Freight prorated to this item by FOB proportion. */
  freightProrated: number;
  /** Insurance prorated to this item by FOB proportion. */
  insuranceProrated: number;
  cif: number;
  customsDuty: number;
  statisticalRate: number;
  vatBase: number;
  iva: number;
  ivaAdditional: number;
  ganancias: number;
  iibb: number;
  fiscalCredits: number;
}

export interface SimulationCalculationInput {
  /**
   * One entry per product/NCM. Each item carries its own FOB value and
   * tax rates so that multi-NCM simulations calculate correctly.
   * For single-item simulations the result is identical to the former
   * aggregate calculation.
   */
  items: SimulationItemInput[];
  totalUnits: number;
  transportMode: TransportMode;
  incoterm: Incoterm;
  cargoItems: CargoItem[];
  containers: ContainerSelection;
  freightRates: FreightRates;
  insurancePercent: number;
  originLocalCharges: number;
  destinationLocalCharges: number;
  customsBrokerFee: number;
  internalFreight: number;
  otherDefinitiveCosts: number;
  companyTaxExemptions?: {
    exemptIvaAdditional: boolean;
    exemptGanancias: boolean;
    exemptIibb: boolean;
  };
}

export interface SimulationCalculationResult {
  cargoSummary: CargoSummary;
  incotermResponsibility: IncotermResponsibility;
  freight: number;
  insurance: number;
  cif: number;
  customsDuty: number;
  statisticalRate: number;
  vatBase: number;
  iva: number;
  ivaAdditional: number;
  ganancias: number;
  iibb: number;
  fiscalCredits: number;
  localExpenses: number;
  definitiveCost: number;
  cashRequired: number;
  unitCost: number;
  logisticsCostOverFobPercent: number;
  taxesOverCifPercent: number;
  /** Per-item breakdown for UI/PDF use. Aggregates above are the sum of these. */
  itemBreakdown: SimulationItemBreakdown[];
}

/**
 * Computes the full simulation cost breakdown.
 *
 * Freight and insurance are calculated for the whole shipment, then prorated
 * to each item by its proportion of the total FOB value (the standard
 * criterion for nationalization cost allocation). Each item's tributos are
 * then calculated using its own NCM-specific alícuotas from the tax catalog.
 * Aggregated totals (cif, customsDuty, etc.) are the sum across all items,
 * keeping the result backward-compatible with the UI that reads top-level fields.
 *
 * Single-item simulations produce mathematically identical results to the
 * former aggregate calculation.
 */
export function calculateSimulationSummary(input: SimulationCalculationInput): SimulationCalculationResult {
  const cargoSummary = calculateCargoSummary(input.transportMode, input.cargoItems, input.containers);
  const incotermResponsibility = getIncotermResponsibility(input.incoterm);

  // Total FOB across all items (using Decimal to avoid float accumulation)
  const totalFob = input.items
    .reduce((acc, item) => acc.plus(item.fobValue), new Decimal(0))
    .toNumber();

  // Freight and insurance are for the whole shipment
  const freight = calculateInternationalFreight(input.transportMode, cargoSummary, input.containers, input.freightRates);
  const insurance = calculateInsurance(totalFob, freight, input.insurancePercent);

  // Per-item breakdown: prorate freight/insurance by FOB proportion, then
  // apply each item's own tax rates.
  // Prorrateo criterion: freightItem = freight × (fobItem / totalFobTotal)
  // If totalFob is 0, distribute equally (edge case: all items at $0 FOB).
  const itemCount = input.items.length || 1;
  const itemBreakdown: SimulationItemBreakdown[] = input.items.map((item) => {
    const proportion = totalFob > 0
      ? new Decimal(item.fobValue).dividedBy(totalFob)
      : new Decimal(1).dividedBy(itemCount);

    const freightProrated = new Decimal(freight).times(proportion).toNumber();
    const insuranceProrated = new Decimal(insurance).times(proportion).toNumber();

    const cif = calculateCIF(item.fobValue, freightProrated, insuranceProrated);
    const customsDuty = calculateCustomsDuty(cif, item.taxRates.importDuty);
    const statisticalRate = calculateStatisticalRate(cif, item.taxRates.statisticalRate);
    const vatBase = calculateVATBase(cif, customsDuty, statisticalRate);
    const iva = calculateVAT(vatBase, item.taxRates.iva);
    const ivaAdditional = input.companyTaxExemptions?.exemptIvaAdditional ? 0 : calculateVATAdditional(vatBase, item.taxRates.ivaAdditional);
    const ganancias = input.companyTaxExemptions?.exemptGanancias ? 0 : calculateGananciasPerception(vatBase, item.taxRates.ganancias);
    const iibb = input.companyTaxExemptions?.exemptIibb ? 0 : calculateIIBBPerception(vatBase, item.taxRates.iibb);
    const fiscalCredits = calculateFiscalCredits(iva, ivaAdditional, ganancias, iibb);

    return {
      itemId: item.id,
      fobValue: item.fobValue,
      freightProrated,
      insuranceProrated,
      cif,
      customsDuty,
      statisticalRate,
      vatBase,
      iva,
      ivaAdditional,
      ganancias,
      iibb,
      fiscalCredits,
    };
  });

  // Sum aggregates from per-item breakdowns using Decimal for precision
  const sumField = (field: keyof Omit<SimulationItemBreakdown, 'itemId'>) =>
    itemBreakdown.reduce((acc, b) => acc.plus(b[field]), new Decimal(0)).toNumber();

  const cif = sumField('cif');
  const customsDuty = sumField('customsDuty');
  const statisticalRate = sumField('statisticalRate');
  const vatBase = sumField('vatBase');
  const iva = sumField('iva');
  const ivaAdditional = sumField('ivaAdditional');
  const ganancias = sumField('ganancias');
  const iibb = sumField('iibb');
  const fiscalCredits = sumField('fiscalCredits');

  const localExpenses = new Decimal(input.originLocalCharges)
    .plus(input.destinationLocalCharges)
    .plus(input.freightRates.bafFsc ?? 0)
    .toNumber();

  const definitiveCost = calculateDefinitiveCost({
    freight,
    insurance,
    localExpenses,
    customsDuty,
    statisticalRate,
    customsBrokerFee: input.customsBrokerFee,
    internalFreight: input.internalFreight,
    otherDefinitiveCosts: input.otherDefinitiveCosts,
  });

  const cashRequired = calculateCashRequired(definitiveCost, fiscalCredits);
  const unitCost = calculateUnitCost(cashRequired, input.totalUnits);

  const logisticsCostOverFobPercent =
    totalFob > 0
      ? new Decimal(freight).plus(localExpenses).dividedBy(totalFob).times(100).toNumber()
      : 0;
  const taxesOverCifPercent =
    cif > 0
      ? new Decimal(customsDuty).plus(statisticalRate).plus(fiscalCredits).dividedBy(cif).times(100).toNumber()
      : 0;

  // Round all monetary outputs to 2 decimal places at the output boundary.
  // This is the ONLY place rounding occurs — never in intermediate steps.
  const round2 = (n: number) => new Decimal(n).toDecimalPlaces(2).toNumber();

  return {
    cargoSummary,
    incotermResponsibility,
    freight: round2(freight),
    insurance: round2(insurance),
    cif: round2(cif),
    customsDuty: round2(customsDuty),
    statisticalRate: round2(statisticalRate),
    vatBase: round2(vatBase),
    iva: round2(iva),
    ivaAdditional: round2(ivaAdditional),
    ganancias: round2(ganancias),
    iibb: round2(iibb),
    fiscalCredits: round2(fiscalCredits),
    localExpenses: round2(localExpenses),
    definitiveCost: round2(definitiveCost),
    cashRequired: round2(cashRequired),
    unitCost: round2(unitCost),
    logisticsCostOverFobPercent: round2(logisticsCostOverFobPercent),
    taxesOverCifPercent: round2(taxesOverCifPercent),
    itemBreakdown,
  };
}
