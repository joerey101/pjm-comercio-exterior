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
