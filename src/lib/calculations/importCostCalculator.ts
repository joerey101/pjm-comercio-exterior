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

import type { CargoItem, ContainerSelection, TransportMode } from '@/types/logistics';
import type { Incoterm } from '@/types/simulation';

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
  const insurance = (fobValue + freight) * (insurancePercent / 100);
  return Math.max(insurance, 50);
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
  return fobValue + freight + insurance;
}

/** DIE = CIF * derecho_importacion */
export function calculateCustomsDuty(cif: number, importDutyPercent: number): number {
  return cif * (importDutyPercent / 100);
}

/** Tasa estadística = CIF * tasa_estadistica */
export function calculateStatisticalRate(cif: number, statisticalRatePercent: number): number {
  return cif * (statisticalRatePercent / 100);
}

/** Base IVA = CIF + DIE + tasa_estadistica */
export function calculateVATBase(cif: number, customsDuty: number, statisticalRate: number): number {
  return cif + customsDuty + statisticalRate;
}

/** IVA = Base IVA * alicuota_iva */
export function calculateVAT(vatBase: number, ivaPercent: number): number {
  return vatBase * (ivaPercent / 100);
}

/** IVA adicional = Base IVA * iva_adicional */
export function calculateVATAdditional(vatBase: number, ivaAdditionalPercent: number): number {
  return vatBase * (ivaAdditionalPercent / 100);
}

/** Ganancias = Base IVA * percepcion_ganancias */
export function calculateGananciasPerception(vatBase: number, gananciasPercent: number): number {
  return vatBase * (gananciasPercent / 100);
}

/** IIBB = Base IVA * percepcion_iibb */
export function calculateIIBBPerception(vatBase: number, iibbPercent: number): number {
  return vatBase * (iibbPercent / 100);
}

/** Créditos fiscales = IVA + IVA adicional + Ganancias + IIBB */
export function calculateFiscalCredits(iva: number, ivaAdditional: number, ganancias: number, iibb: number): number {
  return iva + ivaAdditional + ganancias + iibb;
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
  return (
    input.freight +
    input.insurance +
    input.localExpenses +
    input.customsDuty +
    input.statisticalRate +
    input.customsBrokerFee +
    input.internalFreight +
    input.otherDefinitiveCosts
  );
}

/** Caja necesaria = costo definitivo + créditos fiscales */
export function calculateCashRequired(definitiveCost: number, fiscalCredits: number): number {
  return definitiveCost + fiscalCredits;
}

/** Costo unitario = caja necesaria / cantidad de unidades */
export function calculateUnitCost(cashRequired: number, totalUnits: number): number {
  if (!totalUnits || totalUnits <= 0) return 0;
  return cashRequired / totalUnits;
}

// ---------------------------------------------------------------------------
// Full simulation summary (aggregate entry point used by the wizard/API)
// ---------------------------------------------------------------------------

export interface SimulationCalculationInput {
  fobValue: number;
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
  taxRates: {
    importDuty: number;
    statisticalRate: number;
    iva: number;
    ivaAdditional: number;
    ganancias: number;
    iibb: number;
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
}

export function calculateSimulationSummary(input: SimulationCalculationInput): SimulationCalculationResult {
  const cargoSummary = calculateCargoSummary(input.transportMode, input.cargoItems, input.containers);
  const incotermResponsibility = getIncotermResponsibility(input.incoterm);

  const freight = calculateInternationalFreight(input.transportMode, cargoSummary, input.containers, input.freightRates);
  const insurance = calculateInsurance(input.fobValue, freight, input.insurancePercent);
  const cif = calculateCIF(input.fobValue, freight, insurance);

  const customsDuty = calculateCustomsDuty(cif, input.taxRates.importDuty);
  const statisticalRate = calculateStatisticalRate(cif, input.taxRates.statisticalRate);
  const vatBase = calculateVATBase(cif, customsDuty, statisticalRate);

  const iva = calculateVAT(vatBase, input.taxRates.iva);
  const ivaAdditional = calculateVATAdditional(vatBase, input.taxRates.ivaAdditional);
  const ganancias = calculateGananciasPerception(vatBase, input.taxRates.ganancias);
  const iibb = calculateIIBBPerception(vatBase, input.taxRates.iibb);
  const fiscalCredits = calculateFiscalCredits(iva, ivaAdditional, ganancias, iibb);

  const localExpenses =
    input.originLocalCharges + input.destinationLocalCharges + (input.freightRates.bafFsc ?? 0);

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

  const logisticsCostOverFobPercent = input.fobValue > 0 ? ((freight + localExpenses) / input.fobValue) * 100 : 0;
  const taxesOverCifPercent = cif > 0 ? ((customsDuty + statisticalRate + fiscalCredits) / cif) * 100 : 0;

  return {
    cargoSummary,
    incotermResponsibility,
    freight,
    insurance,
    cif,
    customsDuty,
    statisticalRate,
    vatBase,
    iva,
    ivaAdditional,
    ganancias,
    iibb,
    fiscalCredits,
    localExpenses,
    definitiveCost,
    cashRequired,
    unitCost,
    logisticsCostOverFobPercent,
    taxesOverCifPercent,
  };
}
