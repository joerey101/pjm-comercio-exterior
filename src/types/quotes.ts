export type FormalQuoteStatus =
  | 'draft'
  | 'approved'
  | 'issued'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export const FORMAL_QUOTE_STATUS_LABELS: Record<FormalQuoteStatus, string> = {
  draft: 'Borrador',
  approved: 'Aprobada (interna)',
  issued: 'Enviada al cliente',
  accepted: 'Aceptada por el cliente',
  rejected: 'Rechazada por el cliente',
  expired: 'Vencida',
  cancelled: 'Cancelada',
};

export type FormalQuoteCostCategory = 'customs' | 'taxes' | 'logistics' | 'fees' | 'other';

export const FORMAL_QUOTE_COST_CATEGORY_LABELS: Record<FormalQuoteCostCategory, string> = {
  customs: 'Aduaneros',
  taxes: 'Impuestos',
  logistics: 'Logísticos',
  fees: 'Honorarios PJM',
  other: 'Otros',
};

export interface FormalQuoteItemInput {
  description: string;
  ncmCode: string | null;
  quantity: number;
  unitValue: number;
}

export interface FormalQuoteCostInput {
  category: FormalQuoteCostCategory;
  label: string;
  amount: number;
}
