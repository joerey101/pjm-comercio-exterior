import { describe, expect, it } from 'vitest';
import { computeChecklistStatus } from './checklist';

describe('computeChecklistStatus', () => {
  it('is draft when no checklist has been created yet', () => {
    expect(computeChecklistStatus([])).toEqual({ semaphore: 'draft', hasBlockingDocuments: false });
  });

  it('is red when a blocking item is still pending (blocked by pending documents)', () => {
    const result = computeChecklistStatus([
      { status: 'pending', required: true, blocking: true },
      { status: 'approved_by_pjm', required: true, blocking: false },
    ]);
    expect(result.semaphore).toBe('red');
    expect(result.hasBlockingDocuments).toBe(true);
  });

  it('is red when a blocking item was observed but not yet re-approved', () => {
    const result = computeChecklistStatus([{ status: 'observed_by_pjm', required: true, blocking: true }]);
    expect(result.semaphore).toBe('red');
  });

  it('is yellow when only non-blocking required items are pending', () => {
    const result = computeChecklistStatus([
      { status: 'pending', required: true, blocking: false },
      { status: 'approved_by_pjm', required: true, blocking: true },
    ]);
    expect(result.semaphore).toBe('yellow');
    expect(result.hasBlockingDocuments).toBe(false);
  });

  it('is green when every required item is approved', () => {
    const result = computeChecklistStatus([
      { status: 'approved_by_pjm', required: true, blocking: true },
      { status: 'approved_by_pjm', required: true, blocking: false },
      { status: 'not_applicable', required: false, blocking: false },
    ]);
    expect(result.semaphore).toBe('green');
  });

  it('ignores not_applicable items entirely when deciding blocking status', () => {
    const result = computeChecklistStatus([{ status: 'not_applicable', required: true, blocking: true }]);
    expect(result.semaphore).toBe('green');
    expect(result.hasBlockingDocuments).toBe(false);
  });

  it('treats optional (non-required) pending items as not blocking readiness', () => {
    const result = computeChecklistStatus([
      { status: 'pending', required: false, blocking: false },
      { status: 'approved_by_pjm', required: true, blocking: false },
    ]);
    expect(result.semaphore).toBe('green');
  });
});
