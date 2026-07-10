import { parseCsv } from './csv';
import { normalizeNcmCode } from './normalizeNcmCode';
import { toDateOrNull, type ImportParseResult, type ImportRowError } from './validateNcmInput';
import type { InterventionAgency } from '@/types/ncm';

const VALID_TYPES: InterventionAgency[] = [
  'anmat', 'senasa', 'inal', 'seguridad_electrica', 'chas', 'telecomunicaciones',
  'ambiente', 'medicamentos', 'alimentos', 'instrumental_medico', 'otros',
  'sin_intervencion', 'requiere_validacion',
];
const VALID_SEVERITIES = ['info', 'warning', 'blocking'] as const;

export interface ParsedInterventionRuleRow {
  ncmCode: string | null;
  normalizedNcmCode: string | null;
  chapter: string | null;
  interventionType: InterventionAgency;
  description: string;
  severity: (typeof VALID_SEVERITIES)[number];
  source: string | null;
  validFrom: string | null;
  validTo: string | null;
}

/**
 * Parses + validates an "intervention_rules" CSV. A rule must target either
 * a specific NCM code or a chapter (never both empty) — see
 * `matchInterventionRules` for how exact-NCM rules take priority over
 * chapter-level ones at match time.
 */
export function parseInterventionRulesCsv(text: string): ImportParseResult<ParsedInterventionRuleRow> {
  const records = parseCsv(text);
  const rows: ParsedInterventionRuleRow[] = [];
  const errors: ImportRowError[] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const ncmCode = record.ncm_code?.trim() || null;
    const chapter = record.chapter?.trim() || null;

    if (!ncmCode && !chapter) {
      errors.push({ row: rowNumber, message: 'La fila debe tener "ncm_code" o "chapter".' });
      return;
    }

    const interventionType = (record.intervention_type ?? '').trim() as InterventionAgency;
    if (!VALID_TYPES.includes(interventionType)) {
      errors.push({
        row: rowNumber,
        message: `"intervention_type" inválido: "${record.intervention_type}". Valores válidos: ${VALID_TYPES.join(', ')}.`,
      });
      return;
    }

    const severity = (record.severity ?? '').trim() as (typeof VALID_SEVERITIES)[number];
    if (!VALID_SEVERITIES.includes(severity)) {
      errors.push({ row: rowNumber, message: `"severity" inválida: "${record.severity}". Debe ser info, warning o blocking.` });
      return;
    }

    rows.push({
      ncmCode,
      normalizedNcmCode: ncmCode ? normalizeNcmCode(ncmCode) : null,
      chapter,
      interventionType,
      description: record.description?.trim() || '',
      severity,
      source: record.source?.trim() || null,
      validFrom: toDateOrNull(record.valid_from),
      validTo: toDateOrNull(record.valid_to),
    });
  });

  return { rows, errors, totalRows: records.length };
}
