export interface LocationOption {
  id: string;
  name: string;
  country: string;
  region: string;
}

export const OCEAN_LOCATIONS: LocationOption[] = [
  { id: 'CNSHA', name: 'Shanghai Port (CNSHA)', country: 'China', region: 'Asia' },
  { id: 'NLRTM', name: 'Rotterdam Port (NLRTM)', country: 'Países Bajos', region: 'Europa' },
  { id: 'USMIA', name: 'Port of Miami (USMIA)', country: 'EE.UU.', region: 'Norteamérica' },
  { id: 'BRSSZ', name: 'Porto de Santos (BRSSZ)', country: 'Brasil', region: 'Sudamérica' },
  { id: 'ARADU', name: 'Puerto de Buenos Aires (ARADU)', country: 'Argentina', region: 'Sudamérica' },
  { id: 'CLVAP', name: 'Puerto de Valparaíso (CLVAP)', country: 'Chile', region: 'Sudamérica' },
  { id: 'MXVER', name: 'Puerto de Veracruz (MXVER)', country: 'México', region: 'Norteamérica' },
  { id: 'ESBCN', name: 'Puerto de Barcelona (ESBCN)', country: 'España', region: 'Europa' },
];

export const AIR_LOCATIONS: LocationOption[] = [
  { id: 'PEK', name: 'Beijing Capital Intl (PEK)', country: 'China', region: 'Asia' },
  { id: 'FRA', name: 'Frankfurt Airport (FRA)', country: 'Alemania', region: 'Europa' },
  { id: 'MIA', name: 'Miami International (MIA)', country: 'EE.UU.', region: 'Norteamérica' },
  { id: 'GRU', name: 'Guarulhos Intl (GRU)', country: 'Brasil', region: 'Sudamérica' },
  { id: 'EZE', name: 'Ezeiza - Ministro Pistarini (EZE)', country: 'Argentina', region: 'Sudamérica' },
  { id: 'SCL', name: 'Arturo Merino Benítez (SCL)', country: 'Chile', region: 'Sudamérica' },
  { id: 'MEX', name: 'Benito Juárez Intl (MEX)', country: 'México', region: 'Norteamérica' },
  { id: 'MAD', name: 'Adolfo Suárez Barajas (MAD)', country: 'España', region: 'Europa' },
];

export const ROAD_LOCATIONS: LocationOption[] = [
  { id: 'MZA', name: 'Mendoza Terminal Hub (MZA)', country: 'Argentina', region: 'Sudamérica' },
  { id: 'STG', name: 'Santiago Centro Hub (STG)', country: 'Chile', region: 'Sudamérica' },
  { id: 'URG', name: 'Uruguaiana Aduana Hub (URG)', country: 'Brasil', region: 'Sudamérica' },
  { id: 'CDE', name: 'Ciudad del Este Hub (CDE)', country: 'Paraguay', region: 'Sudamérica' },
  { id: 'NLD', name: 'Nuevo Laredo Customs (NLD)', country: 'México', region: 'Norteamérica' },
];

export function locationsForMode(mode: 'ocean_fcl' | 'ocean_lcl' | 'air' | 'road'): LocationOption[] {
  if (mode === 'air') return AIR_LOCATIONS;
  if (mode === 'road') return ROAD_LOCATIONS;
  return OCEAN_LOCATIONS;
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

export const ROUTE_TARIFFS: Record<string, RouteTariff> = {
  'CNSHA-ARADU': { fcl20: 3100, fcl40: 4200, fcl40hc: 4600, oceanLcl: 95, air: 4.85, road: 0.45, fuel: 110, origin: 150, dest: 220 },
  'CNSHA-EZE': { fcl20: 3100, fcl40: 4200, fcl40hc: 4600, oceanLcl: 95, air: 4.85, road: 0.45, fuel: 110, origin: 150, dest: 220 },
  'NLRTM-ARADU': { fcl20: 3400, fcl40: 4500, fcl40hc: 4950, oceanLcl: 110, air: 5.25, road: 0.5, fuel: 140, origin: 160, dest: 220 },
  'USMIA-ARADU': { fcl20: 2200, fcl40: 3200, fcl40hc: 3500, oceanLcl: 75, air: 3.4, road: 0.35, fuel: 85, origin: 110, dest: 180 },
  'BRSSZ-ARADU': { fcl20: 1400, fcl40: 2100, fcl40hc: 2350, oceanLcl: 45, air: 2.1, road: 0.22, fuel: 50, origin: 90, dest: 140 },
  'CLVAP-ARADU': { fcl20: 1600, fcl40: 2300, fcl40hc: 2500, oceanLcl: 50, air: 2.3, road: 0.28, fuel: 60, origin: 95, dest: 150 },
  default: { fcl20: 2800, fcl40: 3900, fcl40hc: 4200, oceanLcl: 85, air: 4.0, road: 0.35, fuel: 75, origin: 120, dest: 180 },
};

export function getRouteTariff(originId: string, destId: string): RouteTariff {
  return (
    ROUTE_TARIFFS[`${originId}-${destId}`] ??
    ROUTE_TARIFFS[`${destId}-${originId}`] ??
    ROUTE_TARIFFS.default
  );
}
