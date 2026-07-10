import { normalizeNcmCode, chapterOf } from './normalizeNcmCode';

export interface SearchableNcmPosition {
  id: string;
  code: string;
  normalizedCode: string;
  description: string;
  section: string | null;
  chapter: string | null;
}

export type NcmMatchReason = 'exact_code' | 'code_prefix' | 'description' | 'chapter';

export interface NcmSearchResult {
  position: SearchableNcmPosition;
  reason: NcmMatchReason;
  score: number;
}

const REASON_SCORE: Record<NcmMatchReason, number> = {
  exact_code: 100,
  code_prefix: 75,
  description: 50,
  chapter: 25,
};

/**
 * Ranks candidate NCM positions against a free-text query. Pure function —
 * the actual candidate list comes from a DB query in the service layer
 * (`src/services/ncmCatalog.ts`); this only implements the ranking rules so
 * they're unit-testable in isolation:
 *
 *   1. exact code match (dots or not)
 *   2. code starts-with the query
 *   3. description contains the query text
 *   4. query matches the 2-digit chapter
 */
export function rankNcmMatches(query: string, positions: SearchableNcmPosition[]): NcmSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normalizedQuery = normalizeNcmCode(trimmed);
  const lowerQuery = trimmed.toLowerCase();
  const results: NcmSearchResult[] = [];

  for (const position of positions) {
    let reason: NcmMatchReason | null = null;

    if (normalizedQuery && position.normalizedCode === normalizedQuery) {
      reason = 'exact_code';
    } else if (normalizedQuery && normalizedQuery.length >= 2 && position.normalizedCode.startsWith(normalizedQuery)) {
      reason = 'code_prefix';
    } else if (position.description.toLowerCase().includes(lowerQuery)) {
      reason = 'description';
    } else if (normalizedQuery.length === 2 && chapterOf(position.normalizedCode) === normalizedQuery) {
      reason = 'chapter';
    } else if (position.chapter && position.chapter.toLowerCase() === lowerQuery) {
      reason = 'chapter';
    }

    if (reason) {
      results.push({ position, reason, score: REASON_SCORE[reason] });
    }
  }

  return results.sort((a, b) => b.score - a.score || a.position.code.localeCompare(b.position.code));
}
