import { describe, expect, it } from 'vitest';
import { rankNcmMatches, type SearchableNcmPosition } from './searchNcm';

const CATALOG: SearchableNcmPosition[] = [
  { id: '1', code: '8471.30.12', normalizedCode: '84713012', description: 'Notebooks y computadoras portátiles', section: 'XVI', chapter: '84' },
  { id: '2', code: '8471.30.99', normalizedCode: '84713099', description: 'Otras computadoras portátiles', section: 'XVI', chapter: '84' },
  { id: '3', code: '6109.10.00', normalizedCode: '61091000', description: 'Indumentaria y textiles de algodón', section: 'XI', chapter: '61' },
];

describe('rankNcmMatches', () => {
  it('finds an exact match by dotted code', () => {
    const results = rankNcmMatches('8471.30.12', CATALOG);
    expect(results[0].position.id).toBe('1');
    expect(results[0].reason).toBe('exact_code');
  });

  it('finds the same exact match by undotted code', () => {
    const results = rankNcmMatches('84713012', CATALOG);
    expect(results[0].position.id).toBe('1');
    expect(results[0].reason).toBe('exact_code');
  });

  it('ranks a code prefix below an exact match but above description matches', () => {
    const results = rankNcmMatches('8471.30', CATALOG);
    const reasons = results.map((r) => r.reason);
    expect(reasons).toContain('code_prefix');
    expect(results.every((r) => r.position.chapter === '84')).toBe(true);
  });

  it('matches free text against the description', () => {
    const results = rankNcmMatches('textiles', CATALOG);
    expect(results).toHaveLength(1);
    expect(results[0].position.id).toBe('3');
    expect(results[0].reason).toBe('description');
  });

  it('matches a bare 2-digit chapter', () => {
    const results = rankNcmMatches('61', CATALOG);
    expect(results.some((r) => r.position.id === '3')).toBe(true);
  });

  it('returns nothing for an empty query', () => {
    expect(rankNcmMatches('', CATALOG)).toEqual([]);
  });
});
