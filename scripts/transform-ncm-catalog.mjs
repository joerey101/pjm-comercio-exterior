/**
 * transform-ncm-catalog.mjs
 * 
 * Toma la "Tabla maestra" (CSV original con columnas Posición, Descripción,
 * Derechos, Tasa Estadísticas, Impuestos Internos, Anti-Dumping, IVA)
 * y genera dos CSVs compatibles con los parsers de PJM:
 * 1. ncm_catalog_import.csv (Posiciones)
 * 2. tax_parameters_import.csv (Tributos)
 * 
 * Nota: Como las columnas iva_additional, ganancias, iibb no vienen
 * en el CSV fuente, se exportan como 0 (su valor default) para ser
 * revisadas luego por un operador si corresponde.
 * 
 * Uso:
 *   node scripts/transform-ncm-catalog.mjs "/ruta/a/Tabla maestra.csv"
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const inputFile = process.argv[2];

if (!inputFile || !fs.existsSync(inputFile)) {
  console.error(`Error: Archivo de entrada no encontrado. Uso: node scripts/transform-ncm-catalog.mjs "/ruta/al/archivo.csv"`);
  process.exit(1);
}

console.log(`Leyendo: ${inputFile}`);
const fileContent = fs.readFileSync(inputFile, 'utf-8');

// Parsear el CSV original
const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

console.log(`Leídos ${records.length} registros del archivo original.`);

const ncmCatalogRows = [];
const taxParameterRows = [];

for (const row of records) {
  // Buscar keys ignorando mayúsculas y espacios
  const getKey = (name) => Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase());
  
  const posicionKey = getKey('Posición');
  const descripcionKey = getKey('Descripción');
  const derechosKey = getKey('Derechos');
  const estadisticasKey = getKey('Tasa Estadísticas');
  const impuestosKey = getKey('Impuestos Internos');
  const antiDumpingKey = getKey('Anti-Dumping');
  const ivaKey = getKey('IVA');

  if (!posicionKey) continue; // Saltar filas sin NCM

  const code = row[posicionKey].trim();
  const description = descripcionKey ? row[descripcionKey].trim() : '';
  
  // Derivar chapter de los 2 primeros dígitos
  const normalized = code.replace(/[^0-9]/g, '');
  const chapter = normalized.length >= 2 ? normalized.substring(0, 2) : '';

  ncmCatalogRows.push({
    code,
    description,
    section: '', 
    chapter,
    heading: normalized.length >= 4 ? normalized.substring(0, 4) : '',
    subheading: normalized.length >= 6 ? normalized.substring(0, 6) : '',
    aec: '',
    export_rebate: '',
    source: 'tabla_maestra_2026',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: '',
  });

  // Parsear IVA (viene como "21%" a "21")
  let ivaParsed = row[ivaKey] || '0';
  ivaParsed = ivaParsed.replace('%', '').trim();

  // Parsear otros numéricos
  const parseNum = (val) => val ? val.replace(',', '.').trim() : '0';

  taxParameterRows.push({
    ncm_code: code,
    import_duty: parseNum(row[derechosKey]),
    statistical_rate: parseNum(row[estadisticasKey]),
    iva: parseNum(ivaParsed),
    iva_additional: '0',
    ganancias: '0',
    iibb: '0',
    other_tax: parseNum(row[impuestosKey]),
    anti_dumping: parseNum(row[antiDumpingKey]),
    source: 'tabla_maestra_2026',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: '',
  });
}

const outDir = path.dirname(inputFile);
const ncmOutPath = path.join(outDir, 'ncm_catalog_import.csv');
const taxOutPath = path.join(outDir, 'tax_parameters_import.csv');

fs.writeFileSync(ncmOutPath, stringify(ncmCatalogRows, { header: true }));
fs.writeFileSync(taxOutPath, stringify(taxParameterRows, { header: true }));

console.log(`\n¡Transformación exitosa!`);
console.log(`1. Creado: ${ncmOutPath} (${ncmCatalogRows.length} filas)`);
console.log(`2. Creado: ${taxOutPath} (${taxParameterRows.length} filas)`);
console.log(`\nNOTA IMPORTANTE:`);
console.log(`Las columnas "iva_additional", "ganancias" e "iibb" no existían en el CSV fuente.`);
console.log(`Se han cargado con el valor por defecto "0". Se recomienda revisión manual.`);
