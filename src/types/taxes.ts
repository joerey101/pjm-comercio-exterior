export interface TaxRates {
  importDuty: number;
  statisticalRate: number;
  iva: number;
  ivaAdditional: number;
  ganancias: number;
  iibb: number;
}

export interface TaxBreakdown {
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
