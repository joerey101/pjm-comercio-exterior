'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';
import { mapDbError } from '@/lib/errorMessages';
import { logAuditEvent } from '@/lib/auditLog';
import { notifyUser } from '@/lib/notify';
import { computeReadyForQuoteBlockers, type ReadyForQuoteBlocker } from '@/lib/readyForQuote';
import type { SimulationStatus, SimulationDocumentStatus } from '@/types/simulation';
import type { NCMStatus } from '@/types/ncm';
import type { PjmRequestStatus, RequestPriority } from '@/types/documents';
import type { DocumentRow, SimulationChecklistItemRow, SimulationRow } from '@/types/database';

export async function updateSimulationStatus(simulationId: string, status: SimulationStatus) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  await supabase.from('simulations').update({ status }).eq('id', simulationId);
  await logAuditEvent({ entityType: 'simulation', entityId: simulationId, simulationId, userId: admin.id, action: 'simulation_status_changed', newValue: { status } });
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  revalidatePath('/admin');
}

export async function updateNcmStatus(simulationId: string, ncmStatus: NCMStatus) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from('simulations').update({ ncm_status: ncmStatus }).eq('id', simulationId);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
}

export async function updateDocumentStatus(simulationId: string, documentStatus: SimulationDocumentStatus) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from('simulations').update({ document_status: documentStatus }).eq('id', simulationId);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
}

export async function assignRequest(requestId: string, simulationId: string, assignedTo: string | null) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const target = assignedTo ?? admin.id;
  await supabase.from('pjm_requests').update({ assigned_to: target, assigned_at: new Date().toISOString(), last_activity_at: new Date().toISOString() }).eq('id', requestId);
  await logAuditEvent({ entityType: 'pjm_request', entityId: requestId, simulationId, requestId, userId: admin.id, action: 'request_assigned', newValue: { assignedTo: target } });
  revalidatePath('/admin');
  revalidatePath(`/admin/solicitudes/${simulationId}`);
}

export async function updateRequestPriority(requestId: string, simulationId: string, priority: RequestPriority) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  await supabase.from('pjm_requests').update({ priority, last_activity_at: new Date().toISOString() }).eq('id', requestId);
  await logAuditEvent({ entityType: 'pjm_request', entityId: requestId, simulationId, requestId, userId: admin.id, action: 'priority_changed', newValue: { priority } });
  revalidatePath('/admin');
  revalidatePath(`/admin/solicitudes/${simulationId}`);
}

export async function updateRequestStatus(
  requestId: string,
  simulationId: string,
  status: PjmRequestStatus,
  note?: string
): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  if (status === 'waiting_client' && !note?.trim()) {
    return { error: 'Para pedir algo al cliente, dejá un comentario visible explicando qué falta.' };
  }
  const supabase = await createClient();

  const timestamps: Record<string, string> = { last_activity_at: new Date().toISOString() };
  if (status === 'closed' || status === 'cancelled') timestamps.closed_at = new Date().toISOString();

  const { error } = await supabase.from('pjm_requests').update({ status, ...timestamps }).eq('id', requestId);
  if (error) return { error: mapDbError(error.message) };

  await logAuditEvent({ entityType: 'pjm_request', entityId: requestId, simulationId, requestId, userId: admin.id, action: 'request_status_changed', newValue: { status } });

  if (note?.trim()) {
    await supabase.from('comments').insert({
      request_id: requestId,
      simulation_id: simulationId,
      user_id: admin.id,
      comment: note,
      comment_type: 'status_change_note',
      visibility: 'client',
    });
    const { data: simulation } = await supabase.from('simulations').select('user_id, name').eq('id', simulationId).maybeSingle<SimulationRow>();
    if (simulation) {
      await notifyUser({
        userId: simulation.user_id,
        type: 'request_status_changed',
        title: status === 'waiting_client' ? 'PJM necesita algo de vos' : 'Actualización de tu solicitud',
        message: `${simulation.name}: ${note}`,
        linkUrl: `/simulaciones/${simulationId}`,
      });
    }
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  revalidatePath(`/simulaciones/${simulationId}`);
  return { ok: true };
}

export type { ReadyForQuoteBlocker } from '@/lib/readyForQuote';

/**
 * Sprint 3 gating rule (decision logic lives in computeReadyForQuoteBlockers,
 * src/lib/readyForQuote.ts — this is just the DB-fetching wrapper): a
 * request can't be marked ready_for_quote if there are rejected documents
 * without a replacement, unresolved blocking checklist items, or an NCM
 * still needing review — unless an admin explicitly overrides with a
 * mandatory comment.
 */
export async function checkReadyForQuoteBlockers(simulationId: string): Promise<ReadyForQuoteBlocker[]> {
  const supabase = await createClient();

  const [{ data: documents }, { data: checklist }, { data: simulation }] = await Promise.all([
    supabase.from('documents').select('*').eq('simulation_id', simulationId).neq('status', 'replaced').returns<DocumentRow[]>(),
    supabase.from('simulation_checklist_items').select('*').eq('simulation_id', simulationId).returns<SimulationChecklistItemRow[]>(),
    supabase.from('simulations').select('ncm_status').eq('id', simulationId).maybeSingle<SimulationRow>(),
  ]);

  return computeReadyForQuoteBlockers({
    documents: (documents ?? []).map((d) => ({ id: d.id, status: d.status, replacesDocumentId: d.replaces_document_id })),
    checklistItems: (checklist ?? []).map((i) => ({ blocking: i.blocking, status: i.status })),
    ncmStatus: simulation?.ncm_status ?? null,
  });
}

export async function markReadyForQuote(
  requestId: string,
  simulationId: string,
  override: boolean,
  overrideComment?: string
): Promise<{ ok: true } | { error: string; blockers: ReadyForQuoteBlocker[] }> {
  const admin = await requireAdmin();
  const blockers = await checkReadyForQuoteBlockers(simulationId);

  if (blockers.length > 0 && !override) {
    return { error: 'Hay bloqueos sin resolver. Podés forzarlo con "Marcar listo con observaciones".', blockers };
  }
  if (blockers.length > 0 && override && !overrideComment?.trim()) {
    return { error: 'El comentario es obligatorio para marcar listo con observaciones.', blockers };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('pjm_requests')
    .update({ status: 'ready_for_quote', ready_for_quote_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) return { error: mapDbError(error.message), blockers };

  await logAuditEvent({
    entityType: 'pjm_request',
    entityId: requestId,
    simulationId,
    requestId,
    userId: admin.id,
    action: 'request_status_changed',
    newValue: { status: 'ready_for_quote', override, overrideComment, blockers },
  });

  if (override && overrideComment) {
    await supabase.from('comments').insert({
      request_id: requestId,
      simulation_id: simulationId,
      user_id: admin.id,
      comment: `Marcado listo con observaciones: ${overrideComment}`,
      comment_type: 'status_change_note',
      visibility: 'internal',
    });
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}
