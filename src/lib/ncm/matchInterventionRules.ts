import { normalizeNcmCode, chapterOf } from './normalizeNcmCode';
import type { InterventionAgency, InterventionRisk } from '@/types/ncm';

export interface MatchableInterventionRule {
  id: string;
  normalizedNcmCode: string | null;
  chapter: string | null;
  interventionType: InterventionAgency;
  description: string;
  severity: 'info' | 'warning' | 'blocking';
  isActive: boolean;
}

export type InterventionMatchLevel = 'ncm' | 'chapter' | 'none';

export interface InterventionMatchResult {
  level: InterventionMatchLevel;
  rules: MatchableInterventionRule[];
  hasBlocking: boolean;
  hasWarning: boolean;
}

const SEVERITY_TO_RISK: Record<MatchableInterventionRule['severity'], InterventionRisk> = {
  info: 'verde',
  warning: 'amarillo',
  blocking: 'rojo',
};

/**
 * Rule priority: an exact NCM-code rule always wins over a chapter-level
 * rule. If neither exists, the caller should show "sin intervención
 * parametrizada / requiere validación si corresponde" rather than silently
 * assuming there's nothing to check.
 */
export function matchInterventionRules(
  ncmCode: string,
  candidates: MatchableInterventionRule[]
): InterventionMatchResult {
  const normalized = normalizeNcmCode(ncmCode);
  const active = candidates.filter((c) => c.isActive);

  const exact = active.filter((c) => c.normalizedNcmCode && c.normalizedNcmCode === normalized);
  if (exact.length > 0) {
    return summarize('ncm', exact);
  }

  const byChapter = active.filter((c) => !c.normalizedNcmCode && c.chapter && c.chapter === chapterOf(normalized));
  if (byChapter.length > 0) {
    return summarize('chapter', byChapter);
  }

  return { level: 'none', rules: [], hasBlocking: false, hasWarning: false };
}

function summarize(level: InterventionMatchLevel, rules: MatchableInterventionRule[]): InterventionMatchResult {
  return {
    level,
    rules,
    hasBlocking: rules.some((r) => r.severity === 'blocking'),
    hasWarning: rules.some((r) => r.severity === 'warning' || r.severity === 'blocking'),
  };
}

export function interventionRiskFor(rules: MatchableInterventionRule[]): InterventionRisk {
  if (rules.some((r) => r.severity === 'blocking')) return 'rojo';
  if (rules.some((r) => r.severity === 'warning')) return 'amarillo';
  if (rules.length === 0) return 'verde';
  return SEVERITY_TO_RISK[rules[0].severity];
}
