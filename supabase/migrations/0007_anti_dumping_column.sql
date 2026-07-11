-- Agrega columna anti_dumping a tax_parameters
alter table public.tax_parameters
  add column if not exists anti_dumping numeric(6, 3) not null default 0;
