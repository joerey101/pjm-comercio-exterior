import { parseCsv } from './csv';
import { normalizeNcmCode, isCompleteNcmCode } from './normalizeNcmCode';
import { toDateOrNull, toNumberOrNull, type ImportParseResult, type ImportRowError } from './validateNcmInput';

export interface ParsedTaxParameterRow {
  ncmCode: string;
  normalizedNcmCode: string;
  importDuty: number;
  statisticalRate: number;
  iva: number;
  ivaAdditional: number;
  ganancias: number;
  iibb: number;
  otherTax: number;
  source: string | null;
  validFrom: string | null;
  validTo: string | null;
  /** True when ncmCode isn't (yet) a complete/known 8-digit code — allowed, but flagged. */
  warning: string | null;
}

/**
 * Parses + validates a "tax_parameters" CSV. Per spec, rows are accepted
 * even if the NCM position isn't in the catalog yet (the position may be
 * added later, or is still pending validation) — those rows get a warning
 * instead of a hard error so the operator can still stage the import.
 */
export function parseTaxParametersCsv(text: string): ImportParseResult<ParsedTaxParameterRow> {
  const records = parseCsv(text);
  const rows: ParsedTaxParameterRow[] = [];
  const errors: ImportRowError[] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const ncmCode = record.ncm_code ?? '';
    const normalizedNcmCode = normalizeNcmCode(ncmCode);

    if (!ncmCode) {
      errors.push({ row: rowNumber, message: 'Falta la columna "ncm_code".' });
      return;
    }

    const numericFields: [string, string][] = [
      ['import_duty', record.import_duty ?? ''],
      ['statistical_rate', record.statistical_rate ?? ''],
      ['iva', record.iva ?? ''],
      ['iva_additional', record.iva_additional ?? ''],
      ['ganancias', record.ganancias ?? ''],
      ['iibb', record.iibb ?? ''],
    ];
    const parsedNumbers: Record<string, number> = {};
    let hasNumericError = false;
    for (const [key, raw] of numericFields) {
      const n = toNumberOrNull(raw);
      if (n === null) {
        errors.push({ row: rowNumber, message: `Valor numérico inválido en "${key}" para NCM ${ncmCode}: "${raw}".` });
        hasNumericError = true;
        break;
      }
      parsedNumbers[key] = n;
    }
    if (hasNumericError) return;

    rows.push({
      ncmCode: ncmCode.trim(),
      normalizedNcmCode,
      importDuty: parsedNumbers.import_duty,
      statisticalRate: parsedNumbers.statistical_rate,
      iva: parsedNumbers.iva,
      ivaAdditional: parsedNumbers.iva_additional,
      ganancias: parsedNumbers.ganancias,
      iibb: parsedNumbers.iibb,
      otherTax: toNumberOrNull(record.other_tax) ?? 0,
      source: record.source?.trim() || null,
      validFrom: toDateOrNull(record.valid_from),
      validTo: toDateOrNull(record.valid_to),
      warning: isCompleteNcmCode(ncmCode)
        ? null
        : `El código "${ncmCode}" no tiene el formato NCM completo (8 dígitos); se cargará igual, sujeto a revisión.`,
    });
  });

  return { rows, errors, totalRows: records.length };
}
