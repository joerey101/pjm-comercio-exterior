import type { TransportMode, ContainerSelection } from './logistics';
import type { NCMStatus, InterventionAgency, InterventionRisk } from './ncm';

export type OperationType = 'importacion' | 'exportacion';

export type Incoterm = 'EXW' | 'FOB' | 'CFR' | 'CIF' | 'DAP' | 'DDP';

export type Currency = 'USD' | 'EUR' | 'ARS';

export type SimulationStatus =
  | 'draft'
  | 'completed'
  | 'sent_to_pjm'
  | 'under_review'
  | 'missing_documents'
  | 'ncm_review'
  | 'formal_quote_sent'
  | 'closed';

export const SIMULATION_STATUS_LABELS: Record<SimulationStatus, string> = {
  draft: 'Borrador',
  completed: 'Completa',
  sent_to_pjm: 'Enviada a PJM',
  under_review: 'En revisión',
  missing_documents: 'Falta documentación',
  ncm_review: 'Revisión NCM',
  formal_quote_sent: 'Cotización formal emitida',
  closed: 'Cerrada',
};

export type DocumentType =
  | 'invoice'
  | 'proforma'
  | 'packing_list'
  | 'bl'
  | 'awb'
  | 'technical_sheet'
  | 'certificate_of_origin'
  | 'authorization'
  | 'other';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Invoice',
  proforma: 'Proforma',
  packing_list: 'Packing list',
  bl: 'BL (Bill of Lading)',
  awb: 'AWB (Air Waybill)',
  technical_sheet: 'Ficha técnica',
  certificate_of_origin: 'Certificado de origen',
  authorization: 'Autorización',
  other: 'Otros',
};

export type DocumentStatus = 'incomplete' | 'under_review' | 'observed' | 'approved';

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  incomplete: 'Incompleto',
  under_review: 'En revisión',
  observed: 'Observado',
  approved: 'Aprobado',
};

export interface OperationData {
  operationType: OperationType;
  transportMode: TransportMode;
  incoterm: Incoterm;
  originCountry: string;
  originPort: string;
  destinationPort: string;
  finalDestination: string;
  currency: Currency;
  exchangeRate: number;
  shipmentDate: string | null;
  arrivalDate: string | null;
  supplier: string;
  buyer: string;
}

export interface MerchandiseItem {
  id: string;
  description: string;
  technicalDescription: string;
  brandModel: string;
  intendedUse: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  grossWeightKg: number;
  netWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  cbm: number;
  packages: number;
  packagingType: string;
  countryOfOrigin: string;
  ncmCode: string;
  ncmDescription: string;
  ncmStatus: NCMStatus;
  /** Set when the code came from the real catalog search (Sprint 2) vs free-text entry. */
  ncmPositionId: string | null;
  ncmSource: 'catalog' | 'manual';
  taxParameterId: string | null;
}

export interface InterventionSelection {
  agencies: InterventionAgency[];
  risk: InterventionRisk;
  notes: string;
}

export interface ChecklistItemState {
  key: string;
  label: string;
  checked: boolean;
}

export interface SimulationDraft {
  operation: OperationData;
  items: MerchandiseItem[];
  containers: ContainerSelection;
  intervention: InterventionSelection;
  logistics: {
    mainFreightRate: number;
    bafFsc: number;
    originLocalCharges: number;
    destinationLocalCharges: number;
    customsBrokerFee: number;
    insurancePercent: number;
    internalFreight: number;
    otherDefinitiveCosts: number;
  };
  taxRates: {
    importDuty: number;
    statisticalRate: number;
    iva: number;
    ivaAdditional: number;
    ganancias: number;
    iibb: number;
  };
  checklist: ChecklistItemState[];
}
