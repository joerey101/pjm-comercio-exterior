import { describe, expect, it } from 'vitest';
import { parseNcmCatalogCsv } from './importNcmCatalog';

describe('parseNcmCatalogCsv', () => {
  it('parses valid rows and normalizes the code', () => {
    const csv = 'code,description,section,chapter\n8471.30.12,Notebooks,XVI,84\n';
    const { rows, errors } = parseNcmCatalogCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].normalizedCode).toBe('84713012');
  });

  it('rejects an incomplete NCM code', () => {
    const csv = 'code,description\n8471,Notebooks\n';
    const { rows, errors } = parseNcmCatalogCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/inválido/);
  });

  it('rejects a duplicate code within the same file', () => {
    const csv = 'code,description\n8471.30.12,A\n8471.30.12,B\n';
    const { rows, errors } = parseNcmCatalogCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors.some((e) => e.message.includes('duplicado'))).toBe(true);
  });

  it('requires a description', () => {
    const csv = 'code,description\n8471.30.12,\n';
    const { rows, errors } = parseNcmCatalogCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});
