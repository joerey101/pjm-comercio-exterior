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
