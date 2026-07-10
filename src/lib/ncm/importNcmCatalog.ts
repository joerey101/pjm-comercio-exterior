import { parseCsv } from './csv';
import { normalizeNcmCode, isCompleteNcmCode } from './normalizeNcmCode';
import { toDateOrNull, toNumberOrNull, type ImportParseResult, type ImportRowError } from './validateNcmInput';

export interface ParsedNcmRow {
  code: string;
  normalizedCode: string;
  description: string;
  section: string | null;
  chapter: string | null;
  heading: string | null;
  subheading: string | null;
  aec: number | null;
  exportRebate: number | null;
  source: string | null;
  validFrom: string | null;
  validTo: string | null;
}

/**
 * Parses + validates a "ncm_catalog" CSV (columns: code, description,
 * section, chapter, heading, subheading, aec, export_rebate, source,
 * valid_from, valid_to). Duplicate codes within the same file are rejected
 * (keep the first, error on the rest) so an operator notices a bad export
 * before it silently overwrites data.
 */
export function parseNcmCatalogCsv(text: string): ImportParseResult<ParsedNcmRow> {
  const records = parseCsv(text);
  const rows: ParsedNcmRow[] = [];
  const errors: ImportRowError[] = [];
  const seenCodes = new Set<string>();

  records.forEach((record, index) => {
    const rowNumber = index + 2; // +1 header, +1 1-indexed
    const code = record.code ?? '';
    const normalizedCode = normalizeNcmCode(code);

    if (!code) {
      errors.push({ row: rowNumber, message: 'Falta la columna "code".' });
      return;
    }
    if (!isCompleteNcmCode(code)) {
      errors.push({ row: rowNumber, message: `Código NCM inválido: "${code}" (se esperan 8 dígitos).` });
      return;
    }
    if (!record.description) {
      errors.push({ row: rowNumber, message: `Fila ${rowNumber}: falta "description" para el código ${code}.` });
      return;
    }
    if (seenCodes.has(normalizedCode)) {
      errors.push({ row: rowNumber, message: `Código NCM duplicado dentro del archivo: ${code}.` });
      return;
    }
    seenCodes.add(normalizedCode);

    rows.push({
      code: code.trim(),
      normalizedCode,
      description: record.description.trim(),
      section: record.section?.trim() || null,
      chapter: record.chapter?.trim() || null,
      heading: record.heading?.trim() || null,
      subheading: record.subheading?.trim() || null,
      aec: toNumberOrNull(record.aec),
      exportRebate: toNumberOrNull(record.export_rebate),
      source: record.source?.trim() || null,
      validFrom: toDateOrNull(record.valid_from),
      validTo: toDateOrNull(record.valid_to),
    });
  });

  return { rows, errors, totalRows: records.length };
}
