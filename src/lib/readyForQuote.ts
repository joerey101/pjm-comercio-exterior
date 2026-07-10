export interface ReadyForQuoteInput {
  documents: { id: string; status: string; replacesDocumentId: string | null }[];
  checklistItems: { blocking: boolean; status: string }[];
  ncmStatus: string | null;
}

export interface ReadyForQuoteBlocker {
  reason: string;
}

/**
 * Pure gating rule (see MÓDULO 12, Sprint 3): a request can't be marked
 * ready_for_quote if there are rejected documents nobody replaced, blocking
 * checklist items PJM hasn't approved, or an NCM still requiring review.
 * The DB-fetching wrapper lives in checkReadyForQuoteBlockers()
 * (src/app/actions/admin.ts); this is the testable decision logic.
 */
export function computeReadyForQuoteBlockers(input: ReadyForQuoteInput): ReadyForQuoteBlocker[] {
  const blockers: ReadyForQuoteBlocker[] = [];

  const rejectedWithoutReplacement = input.documents.filter(
    (d) => d.status === 'rejected' && !input.documents.some((other) => other.replacesDocumentId === d.id)
  );
  if (rejectedWithoutReplacement.length > 0) {
    blockers.push({ reason: `${rejectedWithoutReplacement.length} documento(s) rechazado(s) sin reemplazo.` });
  }

  const pendingBlocking = input.checklistItems.filter((i) => i.blocking && i.status !== 'approved_by_pjm');
  if (pendingBlocking.length > 0) {
    blockers.push({ reason: `${pendingBlocking.length} ítem(s) bloqueante(s) del checklist sin aprobar.` });
  }

  if (input.ncmStatus === 'requiere_revision') {
    blockers.push({ reason: 'Hay al menos un NCM que requiere revisión sin resolver.' });
  }

  return blockers;
}
