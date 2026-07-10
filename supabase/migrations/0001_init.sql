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
  user_id uuid not null references public.profiles (id) on delete cascade,
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
  using (user_id = auth.uid() or public.is_admin_pjm());

-- simulations: owner or admin
create policy "simulations_select_own_or_admin" on public.simulations for select
  using (user_id = auth.uid() or public.is_admin_pjm());
create policy "simulations_insert_own" on public.simulations for insert
  with check (user_id = auth.uid());
create policy "simulations_update_own_or_admin" on public.simulations for update
  using (user_id = auth.uid() or public.is_admin_pjm());
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
  with check (public.is_admin_pjm());

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
