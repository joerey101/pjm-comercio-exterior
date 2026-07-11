-- Add tax exemption flags to companies table
alter table public.companies
  add column if not exists exempt_iva_additional boolean not null default false,
  add column if not exists exempt_ganancias boolean not null default false,
  add column if not exists exempt_iibb boolean not null default false;
