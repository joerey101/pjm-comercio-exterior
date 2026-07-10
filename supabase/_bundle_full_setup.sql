-- ==============================================================
-- PJM Cotizador — setup completo (migraciones 0001→0006 + seed)
-- Pegar TODO esto en el SQL Editor de Supabase y ejecutar.
-- Si ya intentaste antes y falló: corré primero _reset_recovery.sql
-- Generado automáticamente; no editar a mano.
-- ==============================================================


-- >>>>>>>>>>>>>>>>>>>> migrations/0001_init.sql <<<<<<<<<<<<<<<<<<<<
-- PJM Cotizador Inteligente de Importación Argentina
-- Initial schema: profiles, companies, simulations and related tables.
-- Row Level Security: clients only see their own data; admin_pjm sees everything.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  whatsapp text,
  role text not null default 'cliente' check (role in ('cliente', 'admin_pjm')),
  accepted_terms boolean not null default false,
  accepted_estimate_notice boolean not null default false,
  accepted_commercial_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, whatsapp, role, accepted_terms, accepted_estimate_notice, accepted_commercial_contact)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'whatsapp',
    coalesce(new.raw_user_meta_data ->> 'role', 'cliente'),
    coalesce((new.raw_user_meta_data ->> 'accepted_terms')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'accepted_estimate_notice')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'accepted_commercial_contact')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used throughout RLS policies: is the current user admin_pjm?
create or replace function public.is_admin_pjm()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin_pjm'
  );
$$;

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  business_name text not null default '',
  cuit text not null default '',
  tax_condition text not null default '',
  address text not null default '',
  industry text not null default '',
  import_frequency text not null default '',
  usual_transport_mode text not null default '',
  usual_products text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ncm_positions (reference catalog, admin-managed)
-- ---------------------------------------------------------------------------
create table if not exists public.ncm_positions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  section text,
  chapter text,
  heading text,
  aec numeric(6, 2),
  export_rebate numeric(6, 2),
  source text,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tax_parameters (reference catalog, admin-managed)
-- ---------------------------------------------------------------------------
create table if not exists public.tax_parameters (
  id uuid primary key default gen_random_uuid(),
  ncm_code text references public.ncm_positions (code) on delete set null,
  import_duty numeric(6, 3) not null default 0,
  statistical_rate numeric(6, 3) not null default 0,
  iva numeric(6, 3) not null default 0,
  iva_additional numeric(6, 3) not null default 0,
  ganancias numeric(6, 3) not null default 0,
  iibb numeric(6, 3) not null default 0,
  other_tax numeric(6, 3) not null default 0,
  source text,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- simulations
-- ---------------------------------------------------------------------------
create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  name text not null default 'Nueva simulación',
  operation_type text not null default 'importacion',
  transport_mode text not null default 'ocean_lcl',
  incoterm text not null default 'FOB',
  origin_country text not null default '',
  origin_port text not null default '',
  destination_port text not null default '',
  final_destination text not null default '',
  currency text not null default 'USD',
  exchange_rate numeric(12, 4) not null default 1,
  supplier text,
  buyer text,
  shipment_date date,
  arrival_date date,
  fob_value numeric(14, 2) not null default 0,
  freight numeric(14, 2) not null default 0,
  insurance numeric(14, 2) not null default 0,
  cif_value numeric(14, 2) not null default 0,
  customs_duty numeric(14, 2) not null default 0,
  statistical_rate numeric(14, 2) not null default 0,
  iva numeric(14, 2) not null default 0,
  iva_additional numeric(14, 2) not null default 0,
  ganancias numeric(14, 2) not null default 0,
  iibb numeric(14, 2) not null default 0,
  local_costs numeric(14, 2) not null default 0,
  definitive_cost numeric(14, 2) not null default 0,
  fiscal_credits numeric(14, 2) not null default 0,
  cash_required numeric(14, 2) not null default 0,
  total_cost numeric(14, 2) not null default 0,
  unit_cost numeric(14, 2) not null default 0,
  status text not null default 'draft' check (status in (
    'draft', 'completed', 'sent_to_pjm', 'under_review', 'missing_documents', 'ncm_review', 'formal_quote_sent', 'closed'
  )),
  ncm_status text not null default 'no_informado' check (ncm_status in (
    'no_informado', 'propuesto_cliente', 'pendiente_validacion', 'validado_pjm', 'requiere_revision'
  )),
  document_status text not null default 'incomplete' check (document_status in (
    'incomplete', 'under_review', 'observed', 'approved'
  )),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- simulation_items
-- ---------------------------------------------------------------------------
create table if not exists public.simulation_items (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.simulations (id) on delete cascade,
  description text not null default '',
  technical_description text,
  brand_model text,
  intended_use text,
  quantity numeric(14, 2) not null default 0,
  unit_value numeric(14, 2) not null default 0,
  total_value numeric(14, 2) not null default 0,
  gross_weight numeric(14, 2) not null default 0,
  net_weight numeric(14, 2) not null default 0,
  length_cm numeric(10, 2) not null default 0,
  width_cm numeric(10, 2) not null default 0,
  height_cm numeric(10, 2) not null default 0,
  cbm numeric(12, 4) not null default 0,
  packages integer not null default 1,
  packaging_type text,
  country_of_origin text,
  ncm_code text,
  ncm_description text,
  ncm_status text not null default 'no_informado' check (ncm_status in (
    'no_informado', 'propuesto_cliente', 'pendiente_validacion', 'validado_pjm', 'requiere_revision'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- logistic_costs
-- ---------------------------------------------------------------------------
create table if not exists public.logistic_costs (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null unique references public.simulations (id) on delete cascade,
  freight numeric(14, 2) not null default 0,
  insurance numeric(14, 2) not null default 0,
  baf numeric(14, 2) not null default 0,
  fsc numeric(14, 2) not null default 0,
  origin_charges numeric(14, 2) not null default 0,
  destination_charges numeric(14, 2) not null default 0,
  terminal numeric(14, 2) not null default 0,
  warehouse numeric(14, 2) not null default 0,
  desconsolidation numeric(14, 2) not null default 0,
  handling numeric(14, 2) not null default 0,
  verification numeric(14, 2) not null default 0,
  scan numeric(14, 2) not null default 0,
  storage numeric(14, 2) not null default 0,
  pickup numeric(14, 2) not null default 0,
  empty_return numeric(14, 2) not null default 0,
  internal_freight numeric(14, 2) not null default 0,
  customs_broker_fee numeric(14, 2) not null default 0,
  management_fee numeric(14, 2) not null default 0,
  bank_expenses numeric(14, 2) not null default 0,
  documentation_expenses numeric(14, 2) not null default 0,
  other_expenses numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.simulations (id) on delete cascade,
  document_type text not null check (document_type in (
    'invoice', 'proforma', 'packing_list', 'bl', 'awb', 'technical_sheet', 'certificate_of_origin', 'authorization', 'other'
  )),
  file_url text not null,
  status text not null default 'incomplete' check (status in ('incomplete', 'under_review', 'observed', 'approved')),
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- pjm_requests (formal quote requests)
-- ---------------------------------------------------------------------------
create table if not exists public.pjm_requests (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null unique references public.simulations (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  status text not null default 'sent_to_pjm' check (status in (
    'sent_to_pjm', 'under_review', 'missing_documents', 'ncm_review', 'formal_quote_sent', 'closed'
  )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- comments (internal PJM notes on a request)
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.pjm_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'client')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'companies', 'simulations', 'simulation_items', 'ncm_positions', 'tax_parameters', 'logistic_costs', 'pjm_requests']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes (Postgres does not auto-index foreign key columns; the app filters
-- and joins on all of these, so they matter as soon as data volume grows)
-- ---------------------------------------------------------------------------
create index if not exists companies_user_id_idx on public.companies (user_id);
create index if not exists simulations_user_id_idx on public.simulations (user_id);
create index if not exists simulations_company_id_idx on public.simulations (company_id);
create index if not exists simulations_status_idx on public.simulations (status);
create index if not exists simulation_items_simulation_id_idx on public.simulation_items (simulation_id);
create index if not exists documents_simulation_id_idx on public.documents (simulation_id);
create index if not exists pjm_requests_assigned_to_idx on public.pjm_requests (assigned_to);
create index if not exists pjm_requests_status_idx on public.pjm_requests (status);
create index if not exists comments_request_id_idx on public.comments (request_id);
create index if not exists comments_user_id_idx on public.comments (user_id);
create index if not exists tax_parameters_ncm_code_idx on public.tax_parameters (ncm_code);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.simulations enable row level security;
alter table public.simulation_items enable row level security;
alter table public.logistic_costs enable row level security;
alter table public.documents enable row level security;
alter table public.pjm_requests enable row level security;
alter table public.comments enable row level security;
alter table public.ncm_positions enable row level security;
alter table public.tax_parameters enable row level security;

-- profiles: users see/edit their own row; admin_pjm sees all
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (id = auth.uid() or public.is_admin_pjm());
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- companies: owner or admin
create policy "companies_select_own_or_admin" on public.companies for select
  using (user_id = auth.uid() or public.is_admin_pjm());
create policy "companies_insert_own" on public.companies for insert
  with check (user_id = auth.uid());
create policy "companies_update_own_or_admin" on public.companies for update
  using (user_id = auth.uid() or public.is_admin_pjm())
  with check (user_id = auth.uid() or public.is_admin_pjm());

-- simulations: owner or admin
create policy "simulations_select_own_or_admin" on public.simulations for select
  using (user_id = auth.uid() or public.is_admin_pjm());
create policy "simulations_insert_own" on public.simulations for insert
  with check (user_id = auth.uid());
create policy "simulations_update_own_or_admin" on public.simulations for update
  using (user_id = auth.uid() or public.is_admin_pjm())
  with check (user_id = auth.uid() or public.is_admin_pjm());
create policy "simulations_delete_own" on public.simulations for delete
  using (user_id = auth.uid());

-- simulation_items: via parent simulation ownership
create policy "simulation_items_all_via_parent" on public.simulation_items for all
  using (exists (select 1 from public.simulations s where s.id = simulation_id and (s.user_id = auth.uid() or public.is_admin_pjm())))
  with check (exists (select 1 from public.simulations s where s.id = simulation_id and (s.user_id = auth.uid() or public.is_admin_pjm())));

-- logistic_costs: via parent simulation ownership
create policy "logistic_costs_all_via_parent" on public.logistic_costs for all
  using (exists (select 1 from public.simulations s where s.id = simulation_id and (s.user_id = auth.uid() or public.is_admin_pjm())))
  with check (exists (select 1 from public.simulations s where s.id = simulation_id and (s.user_id = auth.uid() or public.is_admin_pjm())));

-- documents: via parent simulation ownership
create policy "documents_all_via_parent" on public.documents for all
  using (exists (select 1 from public.simulations s where s.id = simulation_id and (s.user_id = auth.uid() or public.is_admin_pjm())))
  with check (exists (select 1 from public.simulations s where s.id = simulation_id and (s.user_id = auth.uid() or public.is_admin_pjm())));

-- pjm_requests: client sees requests for their own simulations; admin sees all
create policy "pjm_requests_select_own_or_admin" on public.pjm_requests for select
  using (exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid()) or public.is_admin_pjm());
create policy "pjm_requests_insert_own" on public.pjm_requests for insert
  with check (exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid()));
create policy "pjm_requests_update_admin" on public.pjm_requests for update
  using (public.is_admin_pjm());

-- comments: admin-only internal notes (client-visibility comments could be exposed later via a view)
create policy "comments_select_admin" on public.comments for select
  using (public.is_admin_pjm());
create policy "comments_insert_admin" on public.comments for insert
  with check (public.is_admin_pjm() and user_id = auth.uid());

-- ncm_positions / tax_parameters: readable by any authenticated user, writable by admin only
create policy "ncm_positions_select_authenticated" on public.ncm_positions for select
  using (auth.role() = 'authenticated');
create policy "ncm_positions_write_admin" on public.ncm_positions for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

create policy "tax_parameters_select_authenticated" on public.tax_parameters for select
  using (auth.role() = 'authenticated');
create policy "tax_parameters_write_admin" on public.tax_parameters for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

-- ---------------------------------------------------------------------------
-- Storage bucket for simulation documents (future document upload phase)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('simulation-documents', 'simulation-documents', false)
on conflict (id) do nothing;

create policy "documents_storage_owner_read" on storage.objects for select
  using (bucket_id = 'simulation-documents' and (owner = auth.uid() or public.is_admin_pjm()));
create policy "documents_storage_owner_write" on storage.objects for insert
  with check (bucket_id = 'simulation-documents' and owner = auth.uid());


-- >>>>>>>>>>>>>>>>>>>> migrations/0002_ncm_catalog.sql <<<<<<<<<<<<<<<<<<<<
-- Sprint 2: real, versioned, parametrizable NCM catalog / tax parameters /
-- intervention rules, replacing the hardcoded sample data from Sprint 1.
--
-- Nothing here is a "definitive" tariff classification: every position a
-- client selects stays pending_pjm_validation until an admin_pjm user
-- validates it (see ncm_validations + simulation_items.ncm_status).

-- ---------------------------------------------------------------------------
-- Catalog versions (NCM positions)
-- ---------------------------------------------------------------------------
create table if not exists public.ncm_catalog_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null default 'manual_upload',
  source_url text,
  imported_by uuid references public.profiles (id) on delete set null,
  imported_at timestamptz not null default now(),
  valid_from date,
  valid_to date,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'archived')),
  row_count integer not null default 0,
  error_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extend the Sprint 1 ncm_positions table rather than replace it.
alter table public.ncm_positions
  add column if not exists version_id uuid references public.ncm_catalog_versions (id) on delete cascade,
  add column if not exists normalized_code text,
  add column if not exists subheading text,
  add column if not exists is_active boolean not null default true,
  add column if not exists requires_review boolean not null default false;

update public.ncm_positions set normalized_code = regexp_replace(code, '[^0-9]', '', 'g') where normalized_code is null;
alter table public.ncm_positions alter column normalized_code set not null;

-- tax_parameters.ncm_code used to FK straight to ncm_positions(code) when
-- codes were globally unique. Codes are now unique per-version, and tax
-- parameters version independently of the NCM catalog, so this FK no longer
-- applies; matching is done at query time via normalized_ncm_code instead.
alter table public.tax_parameters drop constraint if exists tax_parameters_ncm_code_fkey;

-- One row per (code, version): a new version can reintroduce the same code.
-- The Sprint 1 `code text ... unique` creates a UNIQUE CONSTRAINT
-- (ncm_positions_code_key) backed by an index of the same name; that index
-- cannot be dropped on its own, so drop the CONSTRAINT first (which drops its
-- backing index), then drop any bare leftover index defensively.
alter table public.ncm_positions drop constraint if exists ncm_positions_code_key;
drop index if exists ncm_positions_code_key;
create unique index if not exists ncm_positions_code_version_idx on public.ncm_positions (code, version_id);
create index if not exists ncm_positions_normalized_code_idx on public.ncm_positions (normalized_code);
create index if not exists ncm_positions_version_id_idx on public.ncm_positions (version_id);
create index if not exists ncm_positions_active_idx on public.ncm_positions (is_active) where is_active;

-- ---------------------------------------------------------------------------
-- Tax parameter versions
-- ---------------------------------------------------------------------------
create table if not exists public.tax_parameter_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null default 'manual_upload',
  imported_by uuid references public.profiles (id) on delete set null,
  imported_at timestamptz not null default now(),
  valid_from date,
  valid_to date,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'archived')),
  row_count integer not null default 0,
  error_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tax_parameters
  add column if not exists version_id uuid references public.tax_parameter_versions (id) on delete cascade,
  add column if not exists normalized_ncm_code text,
  add column if not exists base_formula text not null default 'cif_plus_duties',
  add column if not exists is_active boolean not null default true;

update public.tax_parameters set normalized_ncm_code = regexp_replace(ncm_code, '[^0-9]', '', 'g') where normalized_ncm_code is null and ncm_code is not null;

create index if not exists tax_parameters_normalized_ncm_code_idx on public.tax_parameters (normalized_ncm_code);
create index if not exists tax_parameters_version_id_idx on public.tax_parameters (version_id);
create index if not exists tax_parameters_active_idx on public.tax_parameters (is_active) where is_active;

-- Wrap the Sprint 1 sample rows (loaded by supabase/seed.sql) in a proper
-- "seed" version so every row belongs to a version, consistent with how
-- real imports will work from now on.
insert into public.ncm_catalog_versions (id, name, source, status, row_count, valid_from, notes)
values ('00000000-0000-0000-0000-000000000001', 'Catálogo semilla (Sprint 1)', 'manual_seed', 'active', 7, current_date, 'Datos de ejemplo cargados en el Sprint 1, conservados como fallback hasta la primera importación real.')
on conflict (id) do nothing;

update public.ncm_positions
set version_id = '00000000-0000-0000-0000-000000000001', is_active = true
where version_id is null;

insert into public.tax_parameter_versions (id, name, source, status, row_count, valid_from, notes)
values ('00000000-0000-0000-0000-000000000002', 'Tributos semilla (Sprint 1)', 'manual_seed', 'active', 7, current_date, 'Datos de ejemplo cargados en el Sprint 1, conservados como fallback hasta la primera importación real.')
on conflict (id) do nothing;

update public.tax_parameters
set version_id = '00000000-0000-0000-0000-000000000002', is_active = true
where version_id is null;

-- ---------------------------------------------------------------------------
-- Intervention rules (ANMAT, SENASA, INAL, etc.) by NCM or by chapter
-- ---------------------------------------------------------------------------
create table if not exists public.intervention_rule_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null default 'manual_upload',
  imported_by uuid references public.profiles (id) on delete set null,
  imported_at timestamptz not null default now(),
  valid_from date,
  valid_to date,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'archived')),
  row_count integer not null default 0,
  error_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intervention_rules (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.intervention_rule_versions (id) on delete cascade,
  ncm_code text,
  normalized_ncm_code text,
  chapter text,
  intervention_type text not null check (intervention_type in (
    'anmat', 'senasa', 'inal', 'seguridad_electrica', 'chas', 'telecomunicaciones',
    'ambiente', 'medicamentos', 'alimentos', 'instrumental_medico', 'otros',
    'sin_intervencion', 'requiere_validacion'
  )),
  description text not null default '',
  severity text not null default 'info' check (severity in ('info', 'warning', 'blocking')),
  source text,
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intervention_rules_normalized_ncm_code_idx on public.intervention_rules (normalized_ncm_code);
create index if not exists intervention_rules_chapter_idx on public.intervention_rules (chapter);
create index if not exists intervention_rules_version_id_idx on public.intervention_rules (version_id);
create index if not exists intervention_rules_active_idx on public.intervention_rules (is_active) where is_active;

-- ---------------------------------------------------------------------------
-- Import jobs (generic: ncm_catalog / tax_parameters / intervention_rules —
-- also reused in Sprint 5 for ARCA manual-upload sync jobs)
-- ---------------------------------------------------------------------------
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('ncm_catalog', 'tax_parameters', 'intervention_rules')),
  provider_key text not null default 'manual_upload',
  trigger_type text not null default 'manual' check (trigger_type in ('manual', 'scheduled', 'webhook', 'system')),
  file_name text,
  version_id uuid,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'completed_with_errors')),
  total_rows integer not null default 0,
  processed_rows integer not null default 0,
  error_rows integer not null default 0,
  imported_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_report jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists import_jobs_job_type_idx on public.import_jobs (job_type);
create index if not exists import_jobs_status_idx on public.import_jobs (status);

-- ---------------------------------------------------------------------------
-- NCM validations: the audit trail of "cliente propuso X, PJM validó/rechazó"
-- ---------------------------------------------------------------------------
create table if not exists public.ncm_validations (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.simulations (id) on delete cascade,
  simulation_item_id uuid references public.simulation_items (id) on delete cascade,
  proposed_ncm_code text,
  validated_ncm_code text,
  status text not null default 'pending' check (status in ('pending', 'validated', 'rejected', 'requires_review')),
  validated_by uuid references public.profiles (id) on delete set null,
  validated_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists ncm_validations_simulation_id_idx on public.ncm_validations (simulation_id);
create index if not exists ncm_validations_simulation_item_id_idx on public.ncm_validations (simulation_item_id);

-- ---------------------------------------------------------------------------
-- simulation_items / simulations: link to the real catalog + warning flags
-- ---------------------------------------------------------------------------
alter table public.simulation_items
  add column if not exists ncm_position_id uuid references public.ncm_positions (id) on delete set null,
  add column if not exists ncm_catalog_version_id uuid references public.ncm_catalog_versions (id) on delete set null,
  add column if not exists tax_parameter_id uuid references public.tax_parameters (id) on delete set null,
  add column if not exists ncm_source text not null default 'manual',
  add column if not exists ncm_validation_notes text;

alter table public.simulations
  add column if not exists has_ncm_warning boolean not null default false,
  add column if not exists has_tax_warning boolean not null default false,
  add column if not exists has_intervention_warning boolean not null default false,
  add column if not exists has_blocking_intervention boolean not null default false;

-- ---------------------------------------------------------------------------
-- updated_at triggers for the new versioned tables
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['ncm_catalog_versions', 'tax_parameter_versions', 'intervention_rule_versions', 'intervention_rules']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.ncm_catalog_versions enable row level security;
alter table public.tax_parameter_versions enable row level security;
alter table public.intervention_rule_versions enable row level security;
alter table public.intervention_rules enable row level security;
alter table public.import_jobs enable row level security;
alter table public.ncm_validations enable row level security;

-- Versions: any authenticated user can see which versions are active (so the
-- UI can show "fuente" / "vigencia"); only admin can write.
create policy "ncm_catalog_versions_select_authenticated" on public.ncm_catalog_versions for select
  using (auth.role() = 'authenticated');
create policy "ncm_catalog_versions_write_admin" on public.ncm_catalog_versions for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

create policy "tax_parameter_versions_select_authenticated" on public.tax_parameter_versions for select
  using (auth.role() = 'authenticated');
create policy "tax_parameter_versions_write_admin" on public.tax_parameter_versions for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

create policy "intervention_rule_versions_select_authenticated" on public.intervention_rule_versions for select
  using (auth.role() = 'authenticated');
create policy "intervention_rule_versions_write_admin" on public.intervention_rule_versions for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

create policy "intervention_rules_select_authenticated" on public.intervention_rules for select
  using (auth.role() = 'authenticated');
create policy "intervention_rules_write_admin" on public.intervention_rules for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

-- Import jobs: admin only, end to end (clients never see import machinery).
create policy "import_jobs_admin_only" on public.import_jobs for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

-- NCM validations: client can see validations for their own simulations
-- (read-only); only admin_pjm can create/update them.
create policy "ncm_validations_select_own_or_admin" on public.ncm_validations for select
  using (exists (select 1 from public.simulations s where s.id = simulation_id and (s.user_id = auth.uid() or public.is_admin_pjm())));
create policy "ncm_validations_write_admin" on public.ncm_validations for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());


-- >>>>>>>>>>>>>>>>>>>> migrations/0003_documents_checklist_admin.sql <<<<<<<<<<<<<<<<<<<<
-- Sprint 3: document management, operational checklist, robust PJM panel.
-- Every action a client or admin takes on a document/checklist item/request
-- is traceable: who, when, what changed (audit_logs), plus a lightweight
-- notifications table for the bell in both dashboards.

-- ---------------------------------------------------------------------------
-- documents: extend the Sprint 1 shell with the full Sprint 3 lifecycle
-- ---------------------------------------------------------------------------
alter table public.documents drop constraint if exists documents_document_type_check;
alter table public.documents add constraint documents_document_type_check check (document_type in (
  'invoice', 'proforma', 'packing_list', 'bl', 'awb', 'technical_sheet', 'certificate_of_origin',
  'authorization', 'intervention_authorization', 'supplier_quote', 'insurance_policy', 'payment_receipt', 'other'
));

alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents add constraint documents_status_check check (status in (
  'uploaded', 'pending_review', 'approved', 'observed', 'rejected', 'replaced', 'expired'
));
alter table public.documents alter column status set default 'uploaded';

alter table public.documents
  add column if not exists uploaded_by uuid references public.profiles (id) on delete set null,
  add column if not exists file_name text not null default 'documento',
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists visibility text not null default 'client_visible' check (visibility in ('client_visible', 'internal_only')),
  add column if not exists version_number integer not null default 1,
  add column if not exists replaces_document_id uuid references public.documents (id) on delete set null,
  add column if not exists review_notes text,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists documents_uploaded_by_idx on public.documents (uploaded_by);
create index if not exists documents_status_idx on public.documents (status);
create index if not exists documents_replaces_document_id_idx on public.documents (replaces_document_id);

drop trigger if exists set_updated_at on public.documents;
create trigger set_updated_at before update on public.documents for each row execute procedure public.set_updated_at();

-- Replacing a document: the client uploads a new row themselves (insert,
-- allowed by RLS below), but marking the OLD row as "replaced" is a status
-- change — normally admin-only. This SECURITY DEFINER function lets the
-- simulation's owner do that one specific, safe transition without a
-- blanket client UPDATE policy on documents.
create or replace function public.replace_document(old_document_id uuid, new_document_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
  v_new_simulation uuid;
  v_old_simulation uuid;
begin
  select s.user_id, d.simulation_id into v_owner, v_old_simulation
  from public.documents d
  join public.simulations s on s.id = d.simulation_id
  where d.id = old_document_id;

  select simulation_id into v_new_simulation from public.documents where id = new_document_id;

  if v_owner is null then
    raise exception 'document not found';
  end if;
  if v_old_simulation is distinct from v_new_simulation then
    raise exception 'documents belong to different simulations';
  end if;
  if v_owner != auth.uid() and not public.is_admin_pjm() then
    raise exception 'not authorized';
  end if;

  update public.documents set status = 'replaced' where id = old_document_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- simulation_checklist_items: the operational checklist (replaces the
-- client-only draft.checklist JSON blob from Sprint 1 with real, reviewable
-- rows once a simulation is sent to PJM)
-- ---------------------------------------------------------------------------
create table if not exists public.simulation_checklist_items (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.simulations (id) on delete cascade,
  checklist_key text not null,
  label text not null,
  description text,
  category text not null check (category in (
    'commercial', 'customs', 'logistics', 'tax', 'interventions', 'documents', 'internal_pjm'
  )),
  status text not null default 'pending' check (status in (
    'pending', 'completed_by_client', 'approved_by_pjm', 'observed_by_pjm', 'not_applicable'
  )),
  required boolean not null default true,
  blocking boolean not null default false,
  completed_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (simulation_id, checklist_key)
);

create index if not exists checklist_items_simulation_id_idx on public.simulation_checklist_items (simulation_id);
create index if not exists checklist_items_status_idx on public.simulation_checklist_items (status);

drop trigger if exists set_updated_at on public.simulation_checklist_items;
create trigger set_updated_at before update on public.simulation_checklist_items for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- comments: broaden the Sprint 1 internal-notes table to also carry
-- client-visible observations tied to a document/checklist item
-- ---------------------------------------------------------------------------
-- A comment can now be tied to a document/checklist item on a simulation
-- before any pjm_request exists (e.g. a document uploaded pre-submission).
alter table public.comments alter column request_id drop not null;

alter table public.comments
  add column if not exists simulation_id uuid references public.simulations (id) on delete cascade,
  add column if not exists document_id uuid references public.documents (id) on delete cascade,
  add column if not exists checklist_item_id uuid references public.simulation_checklist_items (id) on delete cascade,
  add column if not exists comment_type text not null default 'internal_note' check (comment_type in (
    'internal_note', 'client_visible_observation', 'document_observation', 'ncm_observation',
    'checklist_observation', 'status_change_note'
  ));

alter table public.comments drop constraint if exists comments_visibility_check;
alter table public.comments add constraint comments_visibility_check check (visibility in ('internal', 'client'));

create index if not exists comments_simulation_id_idx on public.comments (simulation_id);
create index if not exists comments_document_id_idx on public.comments (document_id);
create index if not exists comments_checklist_item_id_idx on public.comments (checklist_item_id);

-- Backfill simulation_id on any existing comment rows from their request.
update public.comments c
set simulation_id = r.simulation_id
from public.pjm_requests r
where c.request_id = r.id and c.simulation_id is null;

-- ---------------------------------------------------------------------------
-- pjm_requests: operational fields for a robust panel
-- ---------------------------------------------------------------------------
-- Remap the simpler Sprint 1.5 pjm_requests.status values to the Sprint 3
-- operational domain before tightening the check constraint.
update public.pjm_requests set status = 'received' where status = 'sent_to_pjm';
update public.pjm_requests set status = 'in_review' where status = 'under_review';

alter table public.pjm_requests drop constraint if exists pjm_requests_status_check;
alter table public.pjm_requests add constraint pjm_requests_status_check check (status in (
  'received', 'in_review', 'missing_documents', 'ncm_review', 'tax_review', 'logistics_review',
  'waiting_client', 'ready_for_quote', 'formal_quote_sent', 'closed', 'cancelled'
));
alter table public.pjm_requests alter column status set default 'received';
alter table public.pjm_requests drop constraint if exists pjm_requests_priority_check;
alter table public.pjm_requests add constraint pjm_requests_priority_check check (priority in ('low', 'normal', 'high', 'urgent'));

alter table public.pjm_requests
  add column if not exists assigned_at timestamptz,
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists ready_for_quote_at timestamptz,
  add column if not exists closed_at timestamptz;

create index if not exists pjm_requests_priority_idx on public.pjm_requests (priority);
create index if not exists pjm_requests_last_activity_idx on public.pjm_requests (last_activity_at);

-- ---------------------------------------------------------------------------
-- simulations: rollup flags used by the client semaphore + admin filters
-- ---------------------------------------------------------------------------
alter table public.simulations
  add column if not exists checklist_status text not null default 'draft' check (checklist_status in ('draft', 'red', 'yellow', 'green')),
  add column if not exists has_blocking_documents boolean not null default false,
  add column if not exists has_pending_client_action boolean not null default false;

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  simulation_id uuid references public.simulations (id) on delete cascade,
  request_id uuid references public.pjm_requests (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_simulation_id_idx on public.audit_logs (simulation_id);
create index if not exists audit_logs_request_id_idx on public.audit_logs (request_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.simulation_checklist_items enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

-- documents: broaden the Sprint 1 "owner or admin, for all" policy into
-- separate select/insert policies so a client can never update review
-- fields directly (see replace_document() above for the one exception).
drop policy if exists "documents_all_via_parent" on public.documents;

create policy "documents_select_visible_or_admin" on public.documents for select
  using (
    public.is_admin_pjm()
    or (visibility = 'client_visible' and exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid()))
  );

create policy "documents_insert_own_or_admin" on public.documents for insert
  with check (
    public.is_admin_pjm()
    or (
      exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid())
      and status = 'uploaded'
      and visibility = 'client_visible'
      and uploaded_by = auth.uid()
    )
  );

create policy "documents_update_admin_only" on public.documents for update
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

-- simulation_checklist_items: admin manages everything; the owning client
-- may only flip an item between pending <-> completed_by_client.
create policy "checklist_items_select_own_or_admin" on public.simulation_checklist_items for select
  using (public.is_admin_pjm() or exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid()));

create policy "checklist_items_admin_all" on public.simulation_checklist_items for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

create policy "checklist_items_client_complete" on public.simulation_checklist_items for update
  using (exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid()))
  with check (
    exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid())
    and status in ('pending', 'completed_by_client')
  );

-- comments: admin sees/writes everything; client sees only client-visible
-- comments on their own simulations (never internal notes).
drop policy if exists "comments_select_admin" on public.comments;
drop policy if exists "comments_insert_admin" on public.comments;

create policy "comments_select_client_visible_or_admin" on public.comments for select
  using (
    public.is_admin_pjm()
    or (
      visibility = 'client'
      and simulation_id is not null
      and exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid())
    )
  );
create policy "comments_insert_admin" on public.comments for insert
  with check (public.is_admin_pjm() and user_id = auth.uid());

-- audit_logs: admin-only, always.
create policy "audit_logs_admin_only" on public.audit_logs for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

-- notifications: each user only ever sees/updates (marks read) their own.
create policy "notifications_select_own" on public.notifications for select
  using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_insert_admin_or_system" on public.notifications for insert
  with check (public.is_admin_pjm() or user_id = auth.uid());


-- >>>>>>>>>>>>>>>>>>>> migrations/0004_formal_quotes.sql <<<<<<<<<<<<<<<<<<<<
-- Sprint 4: formal commercial quotes with an approval/issuance workflow and
-- client accept/reject response. A formal quote is a frozen, numbered
-- document derived from a pjm_request/simulation — editing the underlying
-- simulation afterwards must never change an already-issued quote, hence
-- the jsonb snapshot + per-quote item/cost rows (copies, not references).

-- ---------------------------------------------------------------------------
-- quote_sequences: one counter per year, used to allocate human-readable
-- quote numbers (COT-2026-0001) atomically at issuance time.
-- ---------------------------------------------------------------------------
create table if not exists public.quote_sequences (
  year integer primary key,
  last_number integer not null default 0
);

-- ---------------------------------------------------------------------------
-- formal_quotes
-- ---------------------------------------------------------------------------
create table if not exists public.formal_quotes (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.simulations (id) on delete cascade,
  request_id uuid references public.pjm_requests (id) on delete set null,
  quote_number text unique,
  status text not null default 'draft' check (status in (
    'draft', 'approved', 'issued', 'accepted', 'rejected', 'expired', 'cancelled'
  )),
  version integer not null default 1,
  currency text not null default 'USD',
  snapshot jsonb not null default '{}'::jsonb,
  payment_terms text,
  validity_days integer not null default 7,
  notes text,
  exclusions text,
  subtotal numeric not null default 0,
  taxes_total numeric not null default 0,
  total numeric not null default 0,
  valid_until date,
  created_by uuid references public.profiles (id) on delete set null,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  issued_at timestamptz,
  sent_at timestamptz,
  client_responded_at timestamptz,
  client_response_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists formal_quotes_simulation_id_idx on public.formal_quotes (simulation_id);
create index if not exists formal_quotes_request_id_idx on public.formal_quotes (request_id);
create index if not exists formal_quotes_status_idx on public.formal_quotes (status);

drop trigger if exists set_updated_at on public.formal_quotes;
create trigger set_updated_at before update on public.formal_quotes for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- formal_quote_items: snapshot copy of simulation_items at draft-creation
-- time, editable by admin before issuance (quantities/prices can be
-- adjusted for the final commercial offer without touching the simulation).
-- ---------------------------------------------------------------------------
create table if not exists public.formal_quote_items (
  id uuid primary key default gen_random_uuid(),
  formal_quote_id uuid not null references public.formal_quotes (id) on delete cascade,
  description text not null,
  ncm_code text,
  quantity numeric not null default 1,
  unit_value numeric not null default 0,
  total_value numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists formal_quote_items_quote_id_idx on public.formal_quote_items (formal_quote_id);

-- ---------------------------------------------------------------------------
-- formal_quote_costs: the commercial cost breakdown (customs duties, taxes,
-- logistics, PJM fees, etc) that makes up the quote total — separate line
-- items so PJM can adjust the final commercial offer independently of the
-- preliminary simulation numbers.
-- ---------------------------------------------------------------------------
create table if not exists public.formal_quote_costs (
  id uuid primary key default gen_random_uuid(),
  formal_quote_id uuid not null references public.formal_quotes (id) on delete cascade,
  category text not null check (category in ('customs', 'taxes', 'logistics', 'fees', 'other')),
  label text not null,
  amount numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists formal_quote_costs_quote_id_idx on public.formal_quote_costs (formal_quote_id);

-- ---------------------------------------------------------------------------
-- issue_formal_quote(): the only path from 'approved' to 'issued'. Allocates
-- the quote number atomically (per-year sequence) and stamps issued_at/
-- sent_at, all inside one SECURITY DEFINER call so two concurrent issuances
-- can never collide on quote_number.
-- ---------------------------------------------------------------------------
create or replace function public.issue_formal_quote(p_quote_id uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_status text;
  v_year integer := extract(year from now())::integer;
  v_number integer;
  v_quote_number text;
begin
  if not public.is_admin_pjm() then
    raise exception 'not authorized';
  end if;

  select status into v_status from public.formal_quotes where id = p_quote_id for update;
  if v_status is null then
    raise exception 'quote not found';
  end if;
  if v_status != 'approved' then
    raise exception 'quote must be approved before issuance';
  end if;

  insert into public.quote_sequences (year, last_number) values (v_year, 1)
    on conflict (year) do update set last_number = public.quote_sequences.last_number + 1
    returning last_number into v_number;

  v_quote_number := 'COT-' || v_year || '-' || lpad(v_number::text, 4, '0');

  update public.formal_quotes
  set status = 'issued', quote_number = v_quote_number, issued_at = now(), sent_at = now(), valid_until = (current_date + validity_days)
  where id = p_quote_id;

  return v_quote_number;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.formal_quotes enable row level security;
alter table public.formal_quote_items enable row level security;
alter table public.formal_quote_costs enable row level security;
alter table public.quote_sequences enable row level security;

-- formal_quotes: admin sees/manages every quote. A client only ever sees
-- quotes on their own simulation once they leave 'draft'/'approved' (i.e.
-- once actually issued) — drafts are internal working documents.
create policy "formal_quotes_select_client_or_admin" on public.formal_quotes for select
  using (
    public.is_admin_pjm()
    or (
      status not in ('draft', 'approved')
      and exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid())
    )
  );

create policy "formal_quotes_admin_write" on public.formal_quotes for insert
  with check (public.is_admin_pjm());

create policy "formal_quotes_admin_update" on public.formal_quotes for update
  using (public.is_admin_pjm())
  with check (public.is_admin_pjm());

-- The client's only write path: respond (accept/reject) to an issued quote
-- on their own simulation. Restricted via WITH CHECK to those two target
-- statuses so a client can never self-approve or edit amounts.
create policy "formal_quotes_client_respond" on public.formal_quotes for update
  using (
    status = 'issued'
    and exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid())
  )
  with check (
    status in ('accepted', 'rejected')
    and exists (select 1 from public.simulations s where s.id = simulation_id and s.user_id = auth.uid())
  );

create policy "formal_quote_items_select_via_parent" on public.formal_quote_items for select
  using (exists (select 1 from public.formal_quotes q where q.id = formal_quote_id and (
    public.is_admin_pjm() or (
      q.status not in ('draft', 'approved')
      and exists (select 1 from public.simulations s where s.id = q.simulation_id and s.user_id = auth.uid())
    )
  )));
create policy "formal_quote_items_admin_write" on public.formal_quote_items for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

create policy "formal_quote_costs_select_via_parent" on public.formal_quote_costs for select
  using (exists (select 1 from public.formal_quotes q where q.id = formal_quote_id and (
    public.is_admin_pjm() or (
      q.status not in ('draft', 'approved')
      and exists (select 1 from public.simulations s where s.id = q.simulation_id and s.user_id = auth.uid())
    )
  )));
create policy "formal_quote_costs_admin_write" on public.formal_quote_costs for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

-- quote_sequences is an internal counter, only touched via issue_formal_quote()
-- (SECURITY DEFINER); no direct client/admin access needed.
create policy "quote_sequences_admin_only" on public.quote_sequences for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());


-- >>>>>>>>>>>>>>>>>>>> migrations/0005_integrations.sql <<<<<<<<<<<<<<<<<<<<
-- Sprint 5: integration surface — feature flags, manual reference data entry
-- (exchange rates, BCRA/VUCE references), a unified outbound-notification
-- log for email/WhatsApp/webhook adapters, and the two scheduled jobs that
-- keep time-bound records (formal quotes, documents) honest. No real
-- external providers are wired in: ARCA reuses the Sprint 2 NCM catalog
-- importer (already supports `source = 'arca'`), and BNA/BCRA/VUCE data is
-- entered manually by an admin until there's a stable API to consume.

-- ---------------------------------------------------------------------------
-- feature_flags: simple on/off switches read by adapters/UI, editable from
-- the health center.
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, enabled, description) values
  ('email_notifications', false, 'Envío de emails salientes (además de la notificación in-app).'),
  ('whatsapp_notifications', false, 'Envío de mensajes de WhatsApp salientes.'),
  ('webhook_notifications', false, 'Disparo de webhooks salientes a sistemas externos.')
on conflict (key) do nothing;

drop trigger if exists set_updated_at on public.feature_flags;
create trigger set_updated_at before update on public.feature_flags for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exchange_rates: manual BNA tipo de cambio entry. A formal quote can
-- reference the rate it used (formal_quotes.exchange_rate, snapshot value
-- — not a foreign key, since a quote must survive even if the rate row is
-- edited later).
-- ---------------------------------------------------------------------------
create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null default current_date,
  currency text not null default 'USD',
  buy_rate numeric not null,
  sell_rate numeric not null,
  source text not null default 'manual_bna',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (rate_date, currency)
);

create index if not exists exchange_rates_date_idx on public.exchange_rates (rate_date desc);

alter table public.formal_quotes add column if not exists exchange_rate numeric;

-- ---------------------------------------------------------------------------
-- regulatory_references: manually curated BCRA/VUCE (and other) reference
-- entries an admin can attach to a case by NCM or keep as general guidance.
-- ---------------------------------------------------------------------------
create table if not exists public.regulatory_references (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('bcra', 'vuce', 'arca', 'other')),
  title text not null,
  description text,
  url text,
  ncm_code text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists regulatory_references_category_idx on public.regulatory_references (category);
create index if not exists regulatory_references_ncm_code_idx on public.regulatory_references (ncm_code);

drop trigger if exists set_updated_at on public.regulatory_references;
create trigger set_updated_at before update on public.regulatory_references for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- integration_logs: one unified log for every outbound notification
-- attempt (email / whatsapp / webhook), regardless of whether it actually
-- reached a provider or just hit the console fallback (no provider
-- configured). This is what the health center reads to show channel status.
-- ---------------------------------------------------------------------------
create table if not exists public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'whatsapp', 'webhook')),
  event_type text not null,
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists integration_logs_channel_idx on public.integration_logs (channel);
create index if not exists integration_logs_created_at_idx on public.integration_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- documents: add an optional expiry date so the expire-documents cron has
-- something to act on (e.g. a certificate of origin with a validity window).
-- ---------------------------------------------------------------------------
alter table public.documents add column if not exists expires_at date;

-- ---------------------------------------------------------------------------
-- Row Level Security — every table here is internal/admin-facing.
-- ---------------------------------------------------------------------------
alter table public.feature_flags enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.regulatory_references enable row level security;
alter table public.integration_logs enable row level security;

create policy "feature_flags_admin_only" on public.feature_flags for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

create policy "exchange_rates_admin_only" on public.exchange_rates for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());

-- regulatory_references: admins manage them, but a client can read active
-- ones (useful context, e.g. shown alongside NCM validation) — read-only.
create policy "regulatory_references_select_active_or_admin" on public.regulatory_references for select
  using (public.is_admin_pjm() or is_active);
create policy "regulatory_references_admin_write" on public.regulatory_references for insert
  with check (public.is_admin_pjm());
create policy "regulatory_references_admin_update" on public.regulatory_references for update
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());
create policy "regulatory_references_admin_delete" on public.regulatory_references for delete
  using (public.is_admin_pjm());

create policy "integration_logs_admin_only" on public.integration_logs for all
  using (public.is_admin_pjm()) with check (public.is_admin_pjm());


-- >>>>>>>>>>>>>>>>>>>> migrations/0006_security_hardening.sql <<<<<<<<<<<<<<<<<<<<
-- Sprint 6: security hardening — cierra dos vías de escalada de privilegios
-- sobre el rol de usuario. La `anon key` es pública y viaja al navegador, así
-- que RLS + triggers son la frontera de seguridad real: nada del lado cliente
-- puede ser de confianza para decidir quién es admin_pjm.
--
--   (a) El signup confiaba en `raw_user_meta_data ->> 'role'`, por lo que un
--       atacante podía saltear la Server Action y llamar supabase.auth.signUp
--       con { data: { role: 'admin_pjm' } } y auto-crearse como admin.
--
--   (b) La política "profiles_update_own" (0001) permitía a cualquier cliente
--       logueado hacer update de su propia fila SIN restringir la columna
--       `role`, por lo que podía promoverse a admin_pjm con un único UPDATE
--       desde la consola del navegador.
--
-- Regla que imponemos: el rol NUNCA se decide desde el cliente. Un alta
-- siempre nace como 'cliente'; el ascenso a admin_pjm solo puede hacerse desde
-- un contexto sin sesión JWT (service_role o el SQL Editor / superusuario),
-- que es exactamente como se crea el primer admin y como lo hace el script
-- scripts/seed-demo-users.mjs.

-- ---------------------------------------------------------------------------
-- (a) handle_new_user: ignorar el rol de la metadata, forzar siempre 'cliente'
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, whatsapp, role, accepted_terms, accepted_estimate_notice, accepted_commercial_contact)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'whatsapp',
    -- Se ignora new.raw_user_meta_data ->> 'role' a propósito: el rol no puede
    -- venir del cliente. Todo usuario nuevo nace como 'cliente'; la promoción
    -- a admin_pjm se hace después con service_role / SQL (ver trigger de abajo).
    'cliente',
    coalesce((new.raw_user_meta_data ->> 'accepted_terms')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'accepted_estimate_notice')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'accepted_commercial_contact')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- (b) Bloquear el cambio de `role` desde una sesión de usuario autenticado.
--     RLS no puede comparar OLD vs NEW, así que usamos un trigger BEFORE UPDATE.
--     Se permite el cambio cuando auth.uid() is null (service_role, SQL Editor,
--     superusuario) o cuando quien edita ya es admin_pjm.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin_pjm() then
    raise exception 'No autorizado a modificar el rol del usuario';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();


-- >>>>>>>>>>>>>>>>>>>> seed.sql (catálogo NCM / tributos) <<<<<<<<<<<<<<<<<<<<
-- Sample NCM catalog + tax parameters, carried over from the original
-- prototype's `ncmDatabase`. Illustrative only — see README "Próximos pasos"
-- for how this should eventually be replaced by a real MERCOSUR/AEC/ARCA feed.
--
-- Escrito para el esquema FINAL (post-migración 0002): cada fila pertenece a
-- una "versión" de catálogo y trae su `normalized_code` (el código sin puntos,
-- que es por donde la app busca y matchea). Las versiones semilla
-- (…0001 catálogo NCM, …0002 tributos) las crea la migración 0002, así que
-- este seed debe correrse DESPUÉS de aplicar todas las migraciones.

insert into public.ncm_positions
  (code, normalized_code, version_id, description, section, chapter, heading, aec, source, is_active)
values
  ('8471.30.12', '84713012', '00000000-0000-0000-0000-000000000001', 'Notebooks y computadoras portátiles', 'XVI', '84', '8471', 0, 'MVP seed', true),
  ('8708.29.90', '87082990', '00000000-0000-0000-0000-000000000001', 'Repuestos autopartes de acero', 'XVII', '87', '8708', 0, 'MVP seed', true),
  ('6109.10.00', '61091000', '00000000-0000-0000-0000-000000000001', 'Indumentaria y textiles de algodón', 'XI', '61', '6109', 0, 'MVP seed', true),
  ('8517.13.00', '85171300', '00000000-0000-0000-0000-000000000001', 'Teléfonos celulares (smartphones)', 'XVI', '85', '8517', 0, 'MVP seed', true),
  ('9018.90.99', '90189099', '00000000-0000-0000-0000-000000000001', 'Equipamiento e instrumental de medicina', 'XVIII', '90', '9018', 0, 'MVP seed', true),
  ('3822.19.00', '38221900', '00000000-0000-0000-0000-000000000001', 'Reactivos de diagnóstico y laboratorio', 'VI', '38', '3822', 0, 'MVP seed', true),
  ('9503.00.22', '95030022', '00000000-0000-0000-0000-000000000001', 'Juguetes de plástico y didácticos', 'XX', '95', '9503', 0, 'MVP seed', true)
on conflict (code, version_id) do nothing;

insert into public.tax_parameters
  (ncm_code, normalized_ncm_code, version_id, import_duty, statistical_rate, iva, iva_additional, ganancias, iibb, source, is_active)
values
  ('8471.30.12', '84713012', '00000000-0000-0000-0000-000000000002', 16.0, 3.0, 10.5, 10.0, 6.0, 2.5, 'MVP seed', true),
  ('8708.29.90', '87082990', '00000000-0000-0000-0000-000000000002', 18.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed', true),
  ('6109.10.00', '61091000', '00000000-0000-0000-0000-000000000002', 35.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed', true),
  ('8517.13.00', '85171300', '00000000-0000-0000-0000-000000000002', 16.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed', true),
  ('9018.90.99', '90189099', '00000000-0000-0000-0000-000000000002', 2.0, 3.0, 10.5, 10.0, 6.0, 2.5, 'MVP seed', true),
  ('3822.19.00', '38221900', '00000000-0000-0000-0000-000000000002', 0.0, 0.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed', true),
  ('9503.00.22', '95030022', '00000000-0000-0000-0000-000000000002', 35.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed', true)
on conflict do nothing;

-- To promote a registered user to PJM admin after signup, run:
-- update public.profiles set role = 'admin_pjm' where email = 'admin@pjm.com.ar';
