import type { ChecklistSemaphore } from '@/types/documents';

export interface ChecklistItemLike {
  status: string;
  required: boolean;
  blocking: boolean;
}

export interface ChecklistStatusResult {
  semaphore: ChecklistSemaphore;
  hasBlockingDocuments: boolean;
}

/**
 * Pure decision logic behind `simulations.checklist_status` (see
 * recalculateChecklistStatus in src/app/actions/checklist.ts, which is the
 * thin DB-fetching wrapper around this function):
 *
 *   - no items yet                                  -> draft
 *   - any blocking item not yet approved             -> red
 *   - any other required item pending/observed       -> yellow
 *   - every required item approved (or n/a)          -> green
 */
export function computeChecklistStatus(items: ChecklistItemLike[]): ChecklistStatusResult {
  if (items.length === 0) {
    return { semaphore: 'draft', hasBlockingDocuments: false };
  }

  const relevant = items.filter((i) => i.status !== 'not_applicable');
  const blockingUnresolved = relevant.some((i) => i.blocking && i.status !== 'approved_by_pjm');
  if (blockingUnresolved) {
    return { semaphore: 'red', hasBlockingDocuments: true };
  }

  const anyPendingOrObserved = relevant.some((i) => i.required && (i.status === 'pending' || i.status === 'observed_by_pjm'));
  if (anyPendingOrObserved) {
    return { semaphore: 'yellow', hasBlockingDocuments: false };
  }

  const allApproved = relevant.every((i) => !i.required || i.status === 'approved_by_pjm');
  return { semaphore: allApproved ? 'green' : 'yellow', hasBlockingDocuments: false };
}
