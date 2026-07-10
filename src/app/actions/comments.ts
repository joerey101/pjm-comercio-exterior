'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';
import { mapDbError } from '@/lib/errorMessages';
import { logAuditEvent } from '@/lib/auditLog';
import { notifyUser } from '@/lib/notify';
import type { CommentType, CommentVisibility } from '@/types/documents';
import type { SimulationRow, CommentRow } from '@/types/database';

export interface CreateCommentInput {
  simulationId: string;
  requestId?: string | null;
  documentId?: string | null;
  checklistItemId?: string | null;
  comment: string;
  commentType: CommentType;
  visibility: CommentVisibility;
}

/**
 * Admin-only (see comments RLS: only admin_pjm can insert). Client-visible
 * observations created this way also notify the simulation's owner.
 */
export async function createComment(input: CreateCommentInput): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  if (!input.comment.trim()) return { error: 'El comentario no puede estar vacío.' };

  const supabase = await createClient();
  const { error } = await supabase.from('comments').insert({
    request_id: input.requestId ?? null,
    simulation_id: input.simulationId,
    document_id: input.documentId ?? null,
    checklist_item_id: input.checklistItemId ?? null,
    user_id: admin.id,
    comment: input.comment,
    comment_type: input.commentType,
    visibility: input.visibility,
  });
  if (error) return { error: mapDbError(error.message) };

  await logAuditEvent({
    entityType: 'comment',
    simulationId: input.simulationId,
    requestId: input.requestId,
    userId: admin.id,
    action: 'comment_created',
    newValue: { commentType: input.commentType, visibility: input.visibility },
  });

  if (input.visibility === 'client') {
    const { data: simulation } = await supabase.from('simulations').select('user_id, name').eq('id', input.simulationId).maybeSingle<SimulationRow>();
    if (simulation) {
      await notifyUser({
        userId: simulation.user_id,
        type: 'pjm_comment',
        title: 'PJM dejó una observación en tu solicitud',
        message: `${simulation.name}: ${input.comment}`,
        linkUrl: `/simulaciones/${input.simulationId}`,
      });
    }
  }

  if (input.requestId) revalidatePath(`/admin/solicitudes/${input.simulationId}`);
  revalidatePath(`/simulaciones/${input.simulationId}`);
  return { ok: true };
}

/** Back-compat wrapper for the Sprint 1 "internal note on a request" flow. */
export async function addInternalComment(requestId: string, simulationId: string, comment: string) {
  return createComment({ simulationId, requestId, comment, commentType: 'internal_note', visibility: 'internal' });
}

export async function listClientVisibleComments(simulationId: string): Promise<CommentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('simulation_id', simulationId)
    .eq('visibility', 'client')
    .order('created_at', { ascending: false })
    .returns<CommentRow[]>();
  return data ?? [];
}
