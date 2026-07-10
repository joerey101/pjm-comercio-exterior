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
