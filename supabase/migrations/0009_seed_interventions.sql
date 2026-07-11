-- Seed intervention rules for testing (Tier 2)
-- These rules attach to chapters or specific NCM codes to trigger warnings in the UI

insert into public.intervention_rule_versions (id, name, source, status, row_count, valid_from, notes)
values ('00000000-0000-0000-0000-000000000003', 'Reglas de Intervención Semilla', 'manual_seed', 'active', 3, current_date, 'Reglas de ejemplo cargadas para probar Tier 2.')
on conflict (id) do nothing;

insert into public.intervention_rules
  (version_id, chapter, ncm_code, normalized_ncm_code, intervention_type, description, severity, is_active)
values
  -- Seguridad eléctrica para el capítulo 85
  ('00000000-0000-0000-0000-000000000003', '85', null, null, 'seguridad_electrica', 'Requiere Certificación de Seguridad Eléctrica', 'blocking', true),
  
  -- ANMAT para instrumental médico (9018.90.99)
  ('00000000-0000-0000-0000-000000000003', null, '9018.90.99', '90189099', 'anmat', 'Requiere intervención de ANMAT (Productos Médicos)', 'blocking', true),

  -- CHAS para autopartes (8708)
  ('00000000-0000-0000-0000-000000000003', '87', null, null, 'chas', 'Requiere Certificado de Homologación de Autopartes de Seguridad (CHAS)', 'warning', true)
on conflict do nothing;
