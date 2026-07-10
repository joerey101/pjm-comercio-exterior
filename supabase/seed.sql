-- Sample NCM catalog + tax parameters, carried over from the original
-- prototype's `ncmDatabase`. Illustrative only — see README "Próximos pasos"
-- for how this should eventually be replaced by a real MERCOSUR/AEC/ARCA feed.
--
-- Escrito para el esquema FINAL (post-migración 0002): cada fila pertenece a
-- una "versión" de catálogo y trae su `normalized_code` (el código sin puntos,
-- que es por donde la app busca y matchea). Las versiones semilla
-- (…0001 catálogo NCM, …0002 tributos) las crea la migración 0002, así que
-- este seed debe correrse DESPUÉS de aplicar todas las migraciones.

insert into public.ncm_positions
  (code, normalized_code, version_id, description, section, chapter, heading, aec, source, is_active)
values
  ('8471.30.12', '84713012', '00000000-0000-0000-0000-000000000001', 'Notebooks y computadoras portátiles', 'XVI', '84', '8471', 0, 'MVP seed', true),
  ('8708.29.90', '87082990', '00000000-0000-0000-0000-000000000001', 'Repuestos autopartes de acero', 'XVII', '87', '8708', 0, 'MVP seed', true),
  ('6109.10.00', '61091000', '00000000-0000-0000-0000-000000000001', 'Indumentaria y textiles de algodón', 'XI', '61', '6109', 0, 'MVP seed', true),
  ('8517.13.00', '85171300', '00000000-0000-0000-0000-000000000001', 'Teléfonos celulares (smartphones)', 'XVI', '85', '8517', 0, 'MVP seed', true),
  ('9018.90.99', '90189099', '00000000-0000-0000-0000-000000000001', 'Equipamiento e instrumental de medicina', 'XVIII', '90', '9018', 0, 'MVP seed', true),
  ('3822.19.00', '38221900', '00000000-0000-0000-0000-000000000001', 'Reactivos de diagnóstico y laboratorio', 'VI', '38', '3822', 0, 'MVP seed', true),
  ('9503.00.22', '95030022', '00000000-0000-0000-0000-000000000001', 'Juguetes de plástico y didácticos', 'XX', '95', '9503', 0, 'MVP seed', true)
on conflict (code, version_id) do nothing;

insert into public.tax_parameters
  (ncm_code, normalized_ncm_code, version_id, import_duty, statistical_rate, iva, iva_additional, ganancias, iibb, source, is_active)
values
  ('8471.30.12', '84713012', '00000000-0000-0000-0000-000000000002', 16.0, 3.0, 10.5, 10.0, 6.0, 2.5, 'MVP seed', true),
  ('8708.29.90', '87082990', '00000000-0000-0000-0000-000000000002', 18.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed', true),
  ('6109.10.00', '61091000', '00000000-0000-0000-0000-000000000002', 35.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed', true),
  ('8517.13.00', '85171300', '00000000-0000-0000-0000-000000000002', 16.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed', true),
  ('9018.90.99', '90189099', '00000000-0000-0000-0000-000000000002', 2.0, 3.0, 10.5, 10.0, 6.0, 2.5, 'MVP seed', true),
  ('3822.19.00', '38221900', '00000000-0000-0000-0000-000000000002', 0.0, 0.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed', true),
  ('9503.00.22', '95030022', '00000000-0000-0000-0000-000000000002', 35.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed', true)
on conflict do nothing;

-- To promote a registered user to PJM admin after signup, run:
-- update public.profiles set role = 'admin_pjm' where email = 'admin@pjm.com.ar';
