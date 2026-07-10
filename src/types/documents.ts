export type DocumentType =
  | 'invoice'
  | 'proforma'
  | 'packing_list'
  | 'bl'
  | 'awb'
  | 'technical_sheet'
  | 'certificate_of_origin'
  | 'authorization'
  | 'intervention_authorization'
  | 'supplier_quote'
  | 'insurance_policy'
  | 'payment_receipt'
  | 'other';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Invoice',
  proforma: 'Proforma',
  packing_list: 'Packing list',
  bl: 'BL (Bill of Lading)',
  awb: 'AWB (Air Waybill)',
  technical_sheet: 'Ficha técnica',
  certificate_of_origin: 'Certificado de origen',
  authorization: 'Autorización de importación',
  intervention_authorization: 'Autorización de intervención',
  supplier_quote: 'Cotización del proveedor',
  insurance_policy: 'Póliza de seguro',
  payment_receipt: 'Comprobante de pago',
  other: 'Otros',
};

export type DocumentStatus = 'uploaded' | 'pending_review' | 'approved' | 'observed' | 'rejected' | 'replaced' | 'expired';

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: 'Cargado',
  pending_review: 'En revisión',
  approved: 'Aprobado',
  observed: 'Observado',
  rejected: 'Rechazado',
  replaced: 'Reemplazado',
  expired: 'Vencido',
};

export type DocumentVisibility = 'client_visible' | 'internal_only';

export type ChecklistItemStatus = 'pending' | 'completed_by_client' | 'approved_by_pjm' | 'observed_by_pjm' | 'not_applicable';

export const CHECKLIST_ITEM_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'Pendiente',
  completed_by_client: 'Completado por el cliente',
  approved_by_pjm: 'Aprobado por PJM',
  observed_by_pjm: 'Observado por PJM',
  not_applicable: 'No aplica',
};

export type ChecklistCategory = 'commercial' | 'customs' | 'logistics' | 'tax' | 'interventions' | 'documents' | 'internal_pjm';

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  commercial: 'Comercial',
  customs: 'Aduana',
  logistics: 'Logística',
  tax: 'Tributario',
  interventions: 'Intervenciones',
  documents: 'Documentación',
  internal_pjm: 'Interno PJM',
};

export type ChecklistSemaphore = 'draft' | 'red' | 'yellow' | 'green';

export const CHECKLIST_SEMAPHORE_LABEL: Record<ChecklistSemaphore, string> = {
  draft: 'Borrador',
  red: 'Faltan documentos / bloqueado',
  yellow: 'Hay observaciones pendientes',
  green: 'Listo para cotización formal',
};

export type PjmRequestStatus =
  | 'received'
  | 'in_review'
  | 'missing_documents'
  | 'ncm_review'
  | 'tax_review'
  | 'logistics_review'
  | 'waiting_client'
  | 'ready_for_quote'
  | 'formal_quote_sent'
  | 'closed'
  | 'cancelled';

export const PJM_REQUEST_STATUS_LABELS: Record<PjmRequestStatus, string> = {
  received: 'Recibida',
  in_review: 'En revisión',
  missing_documents: 'Documentación faltante',
  ncm_review: 'Revisión NCM',
  tax_review: 'Revisión tributaria',
  logistics_review: 'Revisión logística',
  waiting_client: 'Esperando al cliente',
  ready_for_quote: 'Lista para cotización',
  formal_quote_sent: 'Cotización formal enviada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
};

export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export const REQUEST_PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export type CommentType =
  | 'internal_note'
  | 'client_visible_observation'
  | 'document_observation'
  | 'ncm_observation'
  | 'checklist_observation'
  | 'status_change_note';

export type CommentVisibility = 'internal' | 'client';
