import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { dispatchIntegration } from '@/lib/integrations/dispatch';

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
}

/**
 * Creates an in-app notification for any user, regardless of who's acting
 * (a client notifying admins, or vice versa). Uses the service-role client
 * because notifications RLS only lets a session insert rows for itself (see
 * 0003_documents_checklist_admin.sql) — this is the one place that's
 * allowed to fan out to other users. Also fans out to the email adapter
 * (Sprint 5) so every in-app notification has a matching outbound-channel
 * attempt, logged in integration_logs regardless of whether the channel is
 * enabled. Never throws.
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from('notifications').insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link_url: input.linkUrl ?? null,
    });
  } catch {
    // best-effort only
  }
  await dispatchIntegration({
    channel: 'email',
    eventType: input.type,
    recipient: input.userId,
    payload: { title: input.title, message: input.message, linkUrl: input.linkUrl },
  });
}

/** Notifies every admin_pjm user at once (new request, client upload, etc). */
export async function notifyAllAdmins(input: Omit<NotifyInput, 'userId'>): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin_pjm');
    if (!admins || admins.length === 0) return;
    await supabase.from('notifications').insert(
      admins.map((a) => ({
        user_id: a.id,
        type: input.type,
        title: input.title,
        message: input.message,
        link_url: input.linkUrl ?? null,
      }))
    );
  } catch {
    // best-effort only
  }
  await dispatchIntegration({
    channel: 'email',
    eventType: input.type,
    recipient: 'admin_pjm',
    payload: { title: input.title, message: input.message, linkUrl: input.linkUrl },
  });
}
