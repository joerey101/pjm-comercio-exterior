-- ==============================================================
-- RESET DE RECUPERACIÓN — correr UNA sola vez, ANTES de re-ejecutar
-- _bundle_full_setup.sql, para limpiar el estado a medias que dejó la
-- ejecución que falló.
--
-- ⚠️  BORRA TODO el schema `public` (todas las tablas y datos de la app).
--     Es SEGURO ahora porque el proyecto es nuevo y no tiene datos reales.
--     NO lo corras nunca contra una base con datos que quieras conservar.
-- ==============================================================

drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all routines in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- Las policies de storage viven en el schema `storage` (no en `public`), así
-- que hay que borrarlas aparte para que el bundle pueda recrearlas sin error.
drop policy if exists "documents_storage_owner_read" on storage.objects;
drop policy if exists "documents_storage_owner_write" on storage.objects;
