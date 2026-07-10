'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';
import type { SimulationStatus } from '@/types/simulation';
import type { NCMStatus } from '@/types/ncm';
import type { DocumentStatus } from '@/types/simulation';

export async function updateSimulationStatus(simulationId: string, status: SimulationStatus) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from('simulations').update({ status }).eq('id', simulationId);
  await supabase.from('pjm_requests').update({ status }).eq('simulation_id', simulationId);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  revalidatePath('/admin');
}

export async function updateNcmStatus(simulationId: string, ncmStatus: NCMStatus) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from('simulations').update({ ncm_status: ncmStatus }).eq('id', simulationId);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
}

export async function updateDocumentStatus(simulationId: string, documentStatus: DocumentStatus) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from('simulations').update({ document_status: documentStatus }).eq('id', simulationId);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
}

export async function assignRequest(requestId: string, assignedTo: string | null) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  await supabase.from('pjm_requests').update({ assigned_to: assignedTo ?? admin.id }).eq('id', requestId);
  revalidatePath('/admin');
}

export async function addInternalComment(requestId: string, comment: string) {
  const admin = await requireAdmin();
  if (!comment.trim()) return;
  const supabase = await createClient();
  await supabase.from('comments').insert({ request_id: requestId, user_id: admin.id, comment, visibility: 'internal' });
  revalidatePath(`/admin/solicitudes`);
}
