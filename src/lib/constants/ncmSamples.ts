/**
 * Sample NCM catalog carried over from the original prototype's `ncmDatabase`.
 * This is intentionally a small, illustrative dataset for the MVP — see
 * `supabase/migrations/0001_init.sql` (ncm_positions / tax_parameters) for
 * where a real MERCOSUR/AEC/ARCA-sourced catalog would be loaded in the future.
 */
export interface NCMSample {
  key: string;
  code: string;
  description: string;
  importDuty: number;
  statisticalRate: number;
  iva: number;
  ivaAdditional: number;
  ganancias: number;
  iibb: number;
}

export const NCM_SAMPLES: NCMSample[] = [
  { key: 'notebooks', code: '8471.30.12', description: 'Notebooks y computadoras portátiles', importDuty: 16.0, statisticalRate: 3.0, iva: 10.5, ivaAdditional: 10.0, ganancias: 6.0, iibb: 2.5 },
  { key: 'autopartes', code: '8708.29.90', description: 'Repuestos autopartes de acero', importDuty: 18.0, statisticalRate: 3.0, iva: 21.0, ivaAdditional: 20.0, ganancias: 6.0, iibb: 2.5 },
  { key: 'textil', code: '6109.10.00', description: 'Indumentaria y textiles de algodón', importDuty: 35.0, statisticalRate: 3.0, iva: 21.0, ivaAdditional: 20.0, ganancias: 6.0, iibb: 2.5 },
  { key: 'smartphones', code: '8517.13.00', description: 'Teléfonos celulares (smartphones)', importDuty: 16.0, statisticalRate: 3.0, iva: 21.0, ivaAdditional: 20.0, ganancias: 6.0, iibb: 2.5 },
  { key: 'medicos', code: '9018.90.99', description: 'Equipamiento e instrumental de medicina', importDuty: 2.0, statisticalRate: 3.0, iva: 10.5, ivaAdditional: 10.0, ganancias: 6.0, iibb: 2.5 },
  { key: 'quimicos', code: '3822.19.00', description: 'Reactivos de diagnóstico y laboratorio', importDuty: 0.0, statisticalRate: 0.0, iva: 21.0, ivaAdditional: 20.0, ganancias: 6.0, iibb: 2.5 },
  { key: 'juguetes', code: '9503.00.22', description: 'Juguetes de plástico y didácticos', importDuty: 35.0, statisticalRate: 3.0, iva: 21.0, ivaAdditional: 20.0, ganancias: 6.0, iibb: 2.5 },
];

export const DEFAULT_TAX_RATES = {
  importDuty: 10.0,
  statisticalRate: 3.0,
  iva: 21.0,
  ivaAdditional: 20.0,
  ganancias: 6.0,
  iibb: 2.5,
};
