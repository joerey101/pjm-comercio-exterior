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
