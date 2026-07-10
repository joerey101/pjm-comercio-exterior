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
