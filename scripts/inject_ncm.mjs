import fs from 'node:fs';

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

// Variables de entorno de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evqmabxfgplvifvlkcld.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Service Role Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function inject() {
  console.log('Iniciando inyección directa a la base de datos viva...');

  // 1. Leer los archivos generados
  const ncmFile = '/Users/joserey/Downloads/SUBIR_PRIMERO_POSICIONES.csv';
  const taxFile = '/Users/joserey/Downloads/SUBIR_SEGUNDO_TRIBUTOS.csv';

  const ncmRecords = parse(fs.readFileSync(ncmFile, 'utf8'), { columns: true, skip_empty_lines: true, trim: true });
  const taxRecords = parse(fs.readFileSync(taxFile, 'utf8'), { columns: true, skip_empty_lines: true, trim: true });

  // Validar NCMs completos (8 dígitos) y deduplicar por código para evitar constraint errors
  const seenCodes = new Set();
  const validNcm = ncmRecords.filter(r => {
    const code = r.code ? r.code.replace(/[^0-9]/g, '') : '';
    if (code.length !== 8) return false;
    if (seenCodes.has(code)) return false;
    seenCodes.add(code);
    return true;
  });

  const seenTax = new Set();
  const validTax = taxRecords.filter(r => {
    const code = r.ncm_code ? r.ncm_code.replace(/[^0-9]/g, '') : '';
    if (code.length !== 8) return false;
    if (seenTax.has(code)) return false;
    seenTax.add(code);
    return true;
  });

  console.log(`Leídos: ${validNcm.length} posiciones NCM válidas y ${validTax.length} tributos válidos.`);

  // 2. Desactivar versiones anteriores
  console.log('Desactivando versiones anteriores...');
  await supabase.from('ncm_catalog_versions').update({ status: 'archived' }).eq('status', 'active');
  await supabase.from('tax_parameter_versions').update({ status: 'archived' }).eq('status', 'active');
  await supabase.from('ncm_positions').update({ is_active: false }).eq('is_active', true);
  await supabase.from('tax_parameters').update({ is_active: false }).eq('is_active', true);

  // 3. Crear nuevas versiones Activas
  console.log('Creando nuevas versiones activas...');
  const { data: ncmVersion } = await supabase.from('ncm_catalog_versions')
    .insert({ name: 'Inyección Directa', source: 'script', imported_by: null, status: 'active', row_count: validNcm.length, error_count: 0 })
    .select('id').single();

  const { data: taxVersion } = await supabase.from('tax_parameter_versions')
    .insert({ name: 'Inyección Directa', source: 'script', imported_by: null, status: 'active', row_count: validTax.length, error_count: 0 })
    .select('id').single();

  // 4. Insertar Posiciones
  console.log('Insertando posiciones NCM...');
  const ncmInserts = validNcm.map(r => ({
    version_id: ncmVersion.id,
    code: r.code,
    normalized_code: r.code.replace(/[^0-9]/g, ''),
    description: r.description,
    section: r.section || null,
    chapter: r.chapter || null,
    heading: r.heading || null,
    subheading: r.subheading || null,
    aec: r.aec ? parseFloat(r.aec) : null,
    export_rebate: r.export_rebate ? parseFloat(r.export_rebate) : null,
    source: r.source,
    valid_from: r.valid_from || null,
    valid_to: r.valid_to || null,
    is_active: true
  }));

  // Chunk insert to avoid request too large
  const chunkSize = 200;
  for (let i = 0; i < ncmInserts.length; i += chunkSize) {
    const chunk = ncmInserts.slice(i, i + chunkSize);
    const { error } = await supabase.from('ncm_positions').insert(chunk);
    if (error) console.error('Error insertando NCM:', error);
  }

  // 5. Insertar Tributos
  console.log('Insertando parámetros tributarios...');
  const taxInserts = validTax.map(r => ({
    version_id: taxVersion.id,
    ncm_code: r.ncm_code,
    normalized_ncm_code: r.ncm_code.replace(/[^0-9]/g, ''),
    import_duty: parseFloat(r.import_duty) || 0,
    statistical_rate: parseFloat(r.statistical_rate) || 0,
    iva: parseFloat(r.iva) || 0,
    iva_additional: parseFloat(r.iva_additional) || 0,
    ganancias: parseFloat(r.ganancias) || 0,
    iibb: parseFloat(r.iibb) || 0,
    anti_dumping: parseFloat(r.anti_dumping) || 0,
    other_tax: parseFloat(r.other_tax) || 0,
    source: r.source,
    valid_from: r.valid_from || null,
    valid_to: r.valid_to || null,
    is_active: true
  }));

  for (let i = 0; i < taxInserts.length; i += chunkSize) {
    const chunk = taxInserts.slice(i, i + chunkSize);
    const { error } = await supabase.from('tax_parameters').insert(chunk);
    if (error) console.error('Error insertando Tributos:', error);
  }

  console.log('¡INYECCIÓN COMPLETADA! Ya podés usar el sistema.');
}

inject().catch(console.error);
