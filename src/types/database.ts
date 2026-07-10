// Mirrors the Supabase relational schema (see supabase/migrations/0001_init.sql).
// Column names are snake_case to match Postgres; app-facing code maps these
// into the camelCase shapes declared in simulation.ts / logistics.ts / ncm.ts.

export type UserRole = 'cliente' | 'admin_pjm';

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  role: UserRole;
  accepted_terms: boolean;
  accepted_estimate_notice: boolean;
  accepted_commercial_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyRow {
  id: string;
  user_id: string;
  business_name: string;
  cuit: string;
  tax_condition: string;
  address: string;
  industry: string;
  import_frequency: string;
  usual_transport_mode: string;
  usual_products: string;
  created_at: string;
  updated_at: string;
}

export interface SimulationRow {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  operation_type: string;
  transport_mode: string;
  incoterm: string;
  origin_country: string;
  origin_port: string;
  destination_port: string;
  final_destination: string;
  currency: string;
  exchange_rate: number;
  supplier: string | null;
  buyer: string | null;
  shipment_date: string | null;
  arrival_date: string | null;
  fob_value: number;
  freight: number;
  insurance: number;
  cif_value: number;
  customs_duty: number;
  statistical_rate: number;
  iva: number;
  iva_additional: number;
  ganancias: number;
  iibb: number;
  local_costs: number;
  definitive_cost: number;
  fiscal_credits: number;
  cash_required: number;
  total_cost: number;
  unit_cost: number;
  status: string;
  ncm_status: string;
  document_status: string;
  raw_data: unknown;
  created_at: string;
  updated_at: string;
}

export interface SimulationItemRow {
  id: string;
  simulation_id: string;
  description: string;
  technical_description: string | null;
  brand_model: string | null;
  intended_use: string | null;
  quantity: number;
  unit_value: number;
  total_value: number;
  gross_weight: number;
  net_weight: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  cbm: number;
  packages: number;
  packaging_type: string | null;
  country_of_origin: string | null;
  ncm_code: string | null;
  ncm_description: string | null;
  ncm_status: string;
  created_at: string;
  updated_at: string;
}

export interface NCMPositionRow {
  id: string;
  code: string;
  description: string;
  section: string | null;
  chapter: string | null;
  heading: string | null;
  aec: number | null;
  export_rebate: number | null;
  source: string | null;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxParameterRow {
  id: string;
  ncm_code: string | null;
  import_duty: number;
  statistical_rate: number;
  iva: number;
  iva_additional: number;
  ganancias: number;
  iibb: number;
  other_tax: number;
  source: string | null;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogisticCostRow {
  id: string;
  simulation_id: string;
  freight: number;
  insurance: number;
  baf: number;
  fsc: number;
  origin_charges: number;
  destination_charges: number;
  terminal: number;
  warehouse: number;
  desconsolidation: number;
  handling: number;
  verification: number;
  scan: number;
  storage: number;
  pickup: number;
  empty_return: number;
  internal_freight: number;
  customs_broker_fee: number;
  management_fee: number;
  bank_expenses: number;
  documentation_expenses: number;
  other_expenses: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  simulation_id: string;
  document_type: string;
  file_url: string;
  status: string;
  uploaded_at: string;
  reviewed_at: string | null;
}

export interface PjmRequestRow {
  id: string;
  simulation_id: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  request_id: string;
  user_id: string;
  comment: string;
  visibility: 'internal' | 'client';
  created_at: string;
}
