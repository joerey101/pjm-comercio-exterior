import { describe, expect, it } from 'vitest';
import { computeReadyForQuoteBlockers } from './readyForQuote';

describe('computeReadyForQuoteBlockers', () => {
  it('has no blockers when everything is clean', () => {
    const blockers = computeReadyForQuoteBlockers({
      documents: [{ id: 'd1', status: 'approved', replacesDocumentId: null }],
      checklistItems: [{ blocking: true, status: 'approved_by_pjm' }],
      ncmStatus: 'validado_pjm',
    });
    expect(blockers).toEqual([]);
  });

  it('blocks on a rejected document with no replacement', () => {
    const blockers = computeReadyForQuoteBlockers({
      documents: [{ id: 'd1', status: 'rejected', replacesDocumentId: null }],
      checklistItems: [],
      ncmStatus: null,
    });
    expect(blockers).toHaveLength(1);
    expect(blockers[0].reason).toMatch(/rechazado/);
  });

  it('does not block a rejected document once it has been replaced', () => {
    const blockers = computeReadyForQuoteBlockers({
      documents: [
        { id: 'd1', status: 'rejected', replacesDocumentId: null },
        { id: 'd2', status: 'uploaded', replacesDocumentId: 'd1' },
      ],
      checklistItems: [],
      ncmStatus: null,
    });
    expect(blockers).toEqual([]);
  });

  it('blocks on an unapproved blocking checklist item', () => {
    const blockers = computeReadyForQuoteBlockers({
      documents: [],
      checklistItems: [{ blocking: true, status: 'pending' }],
      ncmStatus: null,
    });
    expect(blockers.some((b) => b.reason.includes('bloqueante'))).toBe(true);
  });

  it('does not block on a non-blocking pending checklist item', () => {
    const blockers = computeReadyForQuoteBlockers({
      documents: [],
      checklistItems: [{ blocking: false, status: 'pending' }],
      ncmStatus: null,
    });
    expect(blockers).toEqual([]);
  });

  it('blocks when the NCM requires review', () => {
    const blockers = computeReadyForQuoteBlockers({
      documents: [],
      checklistItems: [],
      ncmStatus: 'requiere_revision',
    });
    expect(blockers.some((b) => b.reason.includes('NCM'))).toBe(true);
  });

  it('accumulates multiple independent blockers', () => {
    const blockers = computeReadyForQuoteBlockers({
      documents: [{ id: 'd1', status: 'rejected', replacesDocumentId: null }],
      checklistItems: [{ blocking: true, status: 'pending' }],
      ncmStatus: 'requiere_revision',
    });
    expect(blockers).toHaveLength(3);
  });
});
