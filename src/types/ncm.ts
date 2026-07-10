export type NCMStatus =
  | 'no_informado'
  | 'propuesto_cliente'
  | 'pendiente_validacion'
  | 'validado_pjm'
  | 'requiere_revision';

export const NCM_STATUS_LABELS: Record<NCMStatus, string> = {
  no_informado: 'No informado',
  propuesto_cliente: 'Propuesto por cliente',
  pendiente_validacion: 'Pendiente de validación PJM',
  validado_pjm: 'Validado por PJM',
  requiere_revision: 'Requiere revisión',
};

export interface NCMPosition {
  id: string;
  code: string;
  description: string;
  section: string | null;
  chapter: string | null;
  heading: string | null;
  aec: number | null;
  exportRebate: number | null;
  source: string | null;
  validFrom: string | null;
  validTo: string | null;
}

export interface TaxParameters {
  id: string;
  ncmCode: string | null;
  importDuty: number;
  statisticalRate: number;
  iva: number;
  ivaAdditional: number;
  ganancias: number;
  iibb: number;
  otherTax: number;
  source: string | null;
  validFrom: string | null;
  validTo: string | null;
}

export type InterventionAgency =
  | 'anmat'
  | 'senasa'
  | 'inal'
  | 'seguridad_electrica'
  | 'chas'
  | 'telecomunicaciones'
  | 'ambiente'
  | 'medicamentos'
  | 'alimentos'
  | 'instrumental_medico'
  | 'otros'
  | 'sin_intervencion'
  | 'requiere_validacion';

export const INTERVENTION_LABELS: Record<InterventionAgency, string> = {
  anmat: 'ANMAT',
  senasa: 'SENASA',
  inal: 'INAL',
  seguridad_electrica: 'Seguridad eléctrica',
  chas: 'CHAS',
  telecomunicaciones: 'Telecomunicaciones',
  ambiente: 'Ambiente',
  medicamentos: 'Medicamentos',
  alimentos: 'Alimentos',
  instrumental_medico: 'Instrumental médico',
  otros: 'Otros',
  sin_intervencion: 'Sin intervención detectada',
  requiere_validacion: 'Requiere validación',
};

export type InterventionRisk = 'verde' | 'amarillo' | 'rojo';
