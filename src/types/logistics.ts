export type TransportMode = 'ocean_fcl' | 'ocean_lcl' | 'air' | 'road';

export type ContainerType = 'cnt20' | 'cnt40' | 'cnt40hc';

export interface CargoItem {
  id: string;
  name: string;
  qty: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
}

export interface ContainerSelection {
  cnt20: number;
  cnt40: number;
  cnt40hc: number;
}

export interface RouteTariff {
  fcl20: number;
  fcl40: number;
  fcl40hc: number;
  oceanLcl: number;
  air: number;
  road: number;
  fuel: number;
  origin: number;
  dest: number;
}

export interface LogisticsInput {
  transportMode: TransportMode;
  originId: string;
  destinationId: string;
  cargoItems: CargoItem[];
  containers: ContainerSelection;
  mainFreightRate: number;
  bafFsc: number;
  originLocalCharges: number;
  destinationLocalCharges: number;
  customsBrokerFee: number;
  insurancePercent: number;
  internalFreight: number;
}

export interface CargoSummary {
  totalGrossWeightKg: number;
  totalVolumeCbm: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
}
