/**
 * NCM codes are conventionally written with dots (8471.30.12) but stored /
 * matched in their normalized, digits-only form (84713012). All catalog
 * lookups go through this so "8471.30.12", "84713012" and "8471301 2" (typo
 * spacing) all resolve to the same row.
 */
export function normalizeNcmCode(code: string | null | undefined): string {
  if (!code) return '';
  return code.replace(/[^0-9]/g, '');
}

/** True if the normalized code has the 8 digits a full NCM position requires. */
export function isCompleteNcmCode(code: string | null | undefined): boolean {
  return normalizeNcmCode(code).length === 8;
}

/** Formats a normalized 8-digit code back into the conventional dotted form. */
export function formatNcmCode(code: string | null | undefined): string {
  const digits = normalizeNcmCode(code);
  if (digits.length !== 8) return code ?? '';
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

/** The 2-digit HS chapter a normalized code belongs to (e.g. "84"). */
export function chapterOf(code: string | null | undefined): string {
  return normalizeNcmCode(code).slice(0, 2);
}
