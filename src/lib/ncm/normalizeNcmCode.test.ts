import { describe, expect, it } from 'vitest';
import { normalizeNcmCode, isCompleteNcmCode, formatNcmCode, chapterOf } from './normalizeNcmCode';

describe('normalizeNcmCode', () => {
  it('strips dots and non-digit characters', () => {
    expect(normalizeNcmCode('8471.30.12')).toBe('84713012');
  });

  it('is a no-op on an already-normalized code', () => {
    expect(normalizeNcmCode('84713012')).toBe('84713012');
  });

  it('tolerates stray whitespace/typos', () => {
    expect(normalizeNcmCode('8471 30 12')).toBe('84713012');
  });

  it('returns an empty string for null/undefined', () => {
    expect(normalizeNcmCode(null)).toBe('');
    expect(normalizeNcmCode(undefined)).toBe('');
  });
});

describe('isCompleteNcmCode', () => {
  it('accepts an 8-digit code with or without dots', () => {
    expect(isCompleteNcmCode('8471.30.12')).toBe(true);
    expect(isCompleteNcmCode('84713012')).toBe(true);
  });

  it('rejects a short/partial code', () => {
    expect(isCompleteNcmCode('8471')).toBe(false);
    expect(isCompleteNcmCode('')).toBe(false);
  });
});

describe('formatNcmCode / chapterOf', () => {
  it('formats a normalized code back into dotted form', () => {
    expect(formatNcmCode('84713012')).toBe('8471.30.12');
  });

  it('derives the 2-digit chapter', () => {
    expect(chapterOf('8471.30.12')).toBe('84');
  });
});
