import type { BadgeTone } from '@/components/ui/Badge';
import type { SimulationStatus, SimulationDocumentStatus } from '@/types/simulation';
import type { NCMStatus, InterventionRisk } from '@/types/ncm';

export const SIMULATION_STATUS_TONE: Record<SimulationStatus, BadgeTone> = {
  draft: 'slate',
  completed: 'blue',
  sent_to_pjm: 'indigo',
  under_review: 'amber',
  missing_documents: 'rose',
  ncm_review: 'amber',
  formal_quote_sent: 'emerald',
  closed: 'slate',
};

export const NCM_STATUS_TONE: Record<NCMStatus, BadgeTone> = {
  no_informado: 'slate',
  propuesto_cliente: 'blue',
  pendiente_validacion: 'amber',
  validado_pjm: 'emerald',
  requiere_revision: 'rose',
};

export const DOCUMENT_STATUS_TONE: Record<SimulationDocumentStatus, BadgeTone> = {
  incomplete: 'rose',
  under_review: 'amber',
  observed: 'amber',
  approved: 'emerald',
};

export const RISK_SEMAPHORE_CLASSES: Record<InterventionRisk, string> = {
  verde: 'bg-emerald-500',
  amarillo: 'bg-amber-500',
  rojo: 'bg-rose-500',
};

export const RISK_SEMAPHORE_LABEL: Record<InterventionRisk, string> = {
  verde: 'Listo para revisión PJM',
  amarillo: 'Falta documentación / validación',
  rojo: 'No embarcar todavía',
};

export const DOCUMENT_STATUS_RISK: Record<SimulationDocumentStatus, InterventionRisk> = {
  approved: 'verde',
  under_review: 'amarillo',
  observed: 'amarillo',
  incomplete: 'rojo',
};
