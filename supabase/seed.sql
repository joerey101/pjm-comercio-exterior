-- Sample NCM catalog + tax parameters, carried over from the original
-- prototype's `ncmDatabase`. Illustrative only — see README "Próximos pasos"
-- for how this should eventually be replaced by a real MERCOSUR/AEC/ARCA feed.

insert into public.ncm_positions (code, description, section, chapter, heading, aec, source)
values
  ('8471.30.12', 'Notebooks y computadoras portátiles', 'XVI', '84', '8471', 0, 'MVP seed'),
  ('8708.29.90', 'Repuestos autopartes de acero', 'XVII', '87', '8708', 0, 'MVP seed'),
  ('6109.10.00', 'Indumentaria y textiles de algodón', 'XI', '61', '6109', 0, 'MVP seed'),
  ('8517.13.00', 'Teléfonos celulares (smartphones)', 'XVI', '85', '8517', 0, 'MVP seed'),
  ('9018.90.99', 'Equipamiento e instrumental de medicina', 'XVIII', '90', '9018', 0, 'MVP seed'),
  ('3822.19.00', 'Reactivos de diagnóstico y laboratorio', 'VI', '38', '3822', 0, 'MVP seed'),
  ('9503.00.22', 'Juguetes de plástico y didácticos', 'XX', '95', '9503', 0, 'MVP seed')
on conflict (code) do nothing;

insert into public.tax_parameters (ncm_code, import_duty, statistical_rate, iva, iva_additional, ganancias, iibb, source)
values
  ('8471.30.12', 16.0, 3.0, 10.5, 10.0, 6.0, 2.5, 'MVP seed'),
  ('8708.29.90', 18.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed'),
  ('6109.10.00', 35.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed'),
  ('8517.13.00', 16.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed'),
  ('9018.90.99', 2.0, 3.0, 10.5, 10.0, 6.0, 2.5, 'MVP seed'),
  ('3822.19.00', 0.0, 0.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed'),
  ('9503.00.22', 35.0, 3.0, 21.0, 20.0, 6.0, 2.5, 'MVP seed')
on conflict do nothing;

-- To promote a registered user to PJM admin after signup, run:
-- update public.profiles set role = 'admin_pjm' where email = 'admin@pjm.com.ar';
