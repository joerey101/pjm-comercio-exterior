import { describe, expect, it } from 'vitest';
import { matchInterventionRules, interventionRiskFor, type MatchableInterventionRule } from './matchInterventionRules';

const RULES: MatchableInterventionRule[] = [
  {
    id: 'r-exact',
    normalizedNcmCode: '90189099',
    chapter: null,
    interventionType: 'instrumental_medico',
    description: 'Requiere autorización ANMAT previa al despacho.',
    severity: 'blocking',
    isActive: true,
  },
  {
    id: 'r-chapter',
    normalizedNcmCode: null,
    chapter: '90',
    interventionType: 'requiere_validacion',
    description: 'Capítulo 90 sujeto a revisión de instrumental.',
    severity: 'warning',
    isActive: true,
  },
  {
    id: 'r-inactive',
    normalizedNcmCode: '90189099',
    chapter: null,
    interventionType: 'otros',
    description: 'Regla vieja, ya no vigente.',
    severity: 'blocking',
    isActive: false,
  },
];

describe('matchInterventionRules', () => {
  it('prioritizes an exact NCM-code rule over a chapter rule', () => {
    const result = matchInterventionRules('9018.90.99', RULES);
    expect(result.level).toBe('ncm');
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].id).toBe('r-exact');
    expect(result.hasBlocking).toBe(true);
  });

  it('falls back to a chapter rule when no exact NCM rule exists', () => {
    const result = matchInterventionRules('9021.10.00', RULES);
    expect(result.level).toBe('chapter');
    expect(result.rules[0].id).toBe('r-chapter');
    expect(result.hasBlocking).toBe(false);
    expect(result.hasWarning).toBe(true);
  });

  it('reports no match when neither an NCM nor chapter rule applies', () => {
    const result = matchInterventionRules('6109.10.00', RULES);
    expect(result.level).toBe('none');
    expect(result.rules).toHaveLength(0);
  });

  it('ignores inactive rules', () => {
    const onlyInactive = RULES.filter((r) => r.id === 'r-inactive');
    const result = matchInterventionRules('9018.90.99', onlyInactive);
    expect(result.level).toBe('none');
  });
});

describe('interventionRiskFor', () => {
  it('is rojo when any rule is blocking', () => {
    expect(interventionRiskFor([RULES[0]])).toBe('rojo');
  });

  it('is amarillo when the worst rule is a warning', () => {
    expect(interventionRiskFor([RULES[1]])).toBe('amarillo');
  });

  it('is verde when there are no rules', () => {
    expect(interventionRiskFor([])).toBe('verde');
  });
});
