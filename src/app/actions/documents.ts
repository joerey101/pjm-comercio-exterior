'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireAdmin } from '@/lib/dal';
import { mapDbError } from '@/lib/errorMessages';
import { logAuditEvent } from '@/lib/auditLog';
import { notifyAllAdmins, notifyUser } from '@/lib/notify';
import type { DocumentRow, SimulationRow } from '@/types/database';
import type { DocumentType, DocumentStatus } from '@/types/documents';

export interface RecordDocumentUploadInput {
  simulationId: string;
  documentType: DocumentType;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  /** Present when this upload replaces a previously observed/rejected document. */
  replacesDocumentId?: string;
}

/**
 * Records the metadata row for a file the client already uploaded straight
 * to Supabase Storage from the browser (see DocumentUploadForm — uploading
 * through a Server Action would mean shipping the whole file through the
 * Next.js server for no benefit; Storage RLS already scopes the object to
 * the uploader). This just inserts the tracking row and, for replacements,
 * marks the old row as superseded via the replace_document() RPC.
 */
export async function recordDocumentUpload(input: RecordDocumentUploadInput): Promise<{ id: string } | { error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: simulation } = await supabase.from('simulations').select('id, user_id, name').eq('id', input.simulationId).maybeSingle<SimulationRow>();
  if (!simulation || simulation.user_id !== user.id) {
    return { error: 'No se encontró la simulación o no tenés permisos.' };
  }

  let versionNumber = 1;
  if (input.replacesDocumentId) {
    const { data: old } = await supabase.from('documents').select('version_number, document_type').eq('id', input.replacesDocumentId).maybeSingle<DocumentRow>();
    versionNumber = (old?.version_number ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      simulation_id: input.simulationId,
      document_type: input.documentType,
      file_url: input.fileUrl,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      status: 'uploaded',
      visibility: 'client_visible',
      version_number: versionNumber,
      replaces_document_id: input.replacesDocumentId ?? null,
      uploaded_by: user.id,
    })
    .select('id')
    .single();

  if (error || !data) return { error: mapDbError(error?.message) };

  if (input.replacesDocumentId) {
    const { error: rpcError } = await supabase.rpc('replace_document', {
      old_document_id: input.replacesDocumentId,
      new_document_id: data.id,
    });
    if (rpcError) return { error: mapDbError(rpcError.message) };
  }

  await logAuditEvent({
    entityType: 'document',
    entityId: data.id,
    simulationId: input.simulationId,
    userId: user.id,
    action: input.replacesDocumentId ? 'document_replaced' : 'document_uploaded',
    newValue: { documentType: input.documentType, fileName: input.fileName },
  });

  await notifyAllAdmins({
    type: input.replacesDocumentId ? 'document_replaced' : 'document_uploaded',
    title: input.replacesDocumentId ? 'Documento reemplazado' : 'Nuevo documento cargado',
    message: `${simulation.name}: se ${input.replacesDocumentId ? 'reemplazó' : 'cargó'} un documento (${input.documentType}).`,
    linkUrl: `/admin/solicitudes/${input.simulationId}`,
  });

  revalidatePath(`/simulaciones/${input.simulationId}`);
  revalidatePath(`/admin/solicitudes/${input.simulationId}`);
  return { id: data.id };
}

export async function listSimulationDocuments(simulationId: string): Promise<DocumentRow[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('simulation_id', simulationId)
    .neq('status', 'replaced')
    .order('uploaded_at', { ascending: false })
    .returns<DocumentRow[]>();
  return data ?? [];
}

export async function updateDocumentStatus(
  documentId: string,
  simulationId: string,
  status: Extract<DocumentStatus, 'approved' | 'observed' | 'rejected'>,
  reviewNotes: string
): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  if ((status === 'observed' || status === 'rejected') && !reviewNotes.trim()) {
    return { error: 'El comentario es obligatorio para observar o rechazar un documento.' };
  }
  const supabase = await createClient();

  const { data: before } = await supabase.from('documents').select('status').eq('id', documentId).maybeSingle();

  const { error } = await supabase
    .from('documents')
    .update({ status, review_notes: reviewNotes || null, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('id', documentId);
  if (error) return { error: mapDbError(error.message) };

  const { data: simulation } = await supabase.from('simulations').select('user_id, name').eq('id', simulationId).maybeSingle<SimulationRow>();

  await logAuditEvent({
    entityType: 'document',
    entityId: documentId,
    simulationId,
    userId: admin.id,
    action: status === 'approved' ? 'document_approved' : status === 'observed' ? 'document_observed' : 'document_rejected',
    previousValue: before,
    newValue: { status, reviewNotes },
  });

  if ((status === 'observed' || status === 'rejected') && simulation) {
    await supabase.from('comments').insert({
      request_id: null,
      simulation_id: simulationId,
      document_id: documentId,
      user_id: admin.id,
      comment: reviewNotes,
      comment_type: 'document_observation',
      visibility: 'client',
    });
    await notifyUser({
      userId: simulation.user_id,
      type: status === 'observed' ? 'document_observed' : 'document_rejected',
      title: status === 'observed' ? 'Un documento tuyo fue observado' : 'Un documento tuyo fue rechazado',
      message: `${simulation.name}: ${reviewNotes}`,
      linkUrl: `/simulaciones/${simulationId}`,
    });
  }

  revalidatePath(`/simulaciones/${simulationId}`);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}
