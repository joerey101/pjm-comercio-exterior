import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface AuditLogEntry {
  entityType: string;
  entityId?: string | null;
  simulationId?: string | null;
  requestId?: string | null;
  userId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit trail write, callable from any server action
 * regardless of whether the acting user is a client or admin_pjm. Uses the
 * service-role client deliberately: audit_logs is RLS-locked to admin_pjm
 * for *reads* (see 0003_documents_checklist_admin.sql), but both clients and
 * admins trigger auditable events (document_uploaded, checklist completed,
 * etc), so writes need to bypass that read restriction. Never throws — a
 * logging failure must not block the underlying action.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from('audit_logs').insert({
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      simulation_id: entry.simulationId ?? null,
      request_id: entry.requestId ?? null,
      user_id: entry.userId,
      action: entry.action,
      previous_value: entry.previousValue ?? null,
      new_value: entry.newValue ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch {
    // best-effort only
  }
}
