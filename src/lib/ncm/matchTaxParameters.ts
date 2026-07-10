import { normalizeNcmCode } from './normalizeNcmCode';

export interface MatchableTaxParameter {
  id: string;
  normalizedNcmCode: string | null;
  isActive: boolean;
  importDuty: number;
  statisticalRate: number;
  iva: number;
  ivaAdditional: number;
  ganancias: number;
  iibb: number;
  otherTax: number;
}

/**
 * Picks the active tax parameter row for an NCM code. Only an exact,
 * normalized-code match on an active row counts — there is no chapter-level
 * fallback for tax rates (unlike interventions): applying another position's
 * duty rate "close enough" would silently misstate the calculation, so the
 * caller must fall back to the "no hay parámetros activos" warning instead.
 */
export function matchTaxParameters(
  ncmCode: string,
  candidates: MatchableTaxParameter[]
): MatchableTaxParameter | null {
  const normalized = normalizeNcmCode(ncmCode);
  if (!normalized) return null;
  return candidates.find((c) => c.isActive && c.normalizedNcmCode === normalized) ?? null;
}
