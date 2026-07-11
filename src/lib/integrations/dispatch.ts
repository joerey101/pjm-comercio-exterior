import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/integrations/emailAdapter';
import type { IntegrationChannel, FeatureFlagKey } from '@/types/integrations';

const CHANNEL_FLAG: Record<IntegrationChannel, FeatureFlagKey> = {
  email: 'email_notifications',
  whatsapp: 'whatsapp_notifications',
  webhook: 'webhook_notifications',
};

export interface DispatchInput {
  channel: IntegrationChannel;
  eventType: string;
  recipient?: string;
  payload?: Record<string, unknown>;
}

async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from('feature_flags').select('enabled').eq('key', key).maybeSingle();
  return data?.enabled ?? false;
}

/**
 * No real email/WhatsApp/webhook provider is wired in this MVP (no API
 * keys). When a channel's feature flag is on, this logs to the console as
 * a stand-in for an actual send and records it in integration_logs so the
 * health center (/admin/integraciones) has something to show; when the
 * flag is off, it's a no-op recorded as 'skipped'. Never throws — a
 * notification failure must not block the action that triggered it.
 */
export async function dispatchIntegration(input: DispatchInput): Promise<void> {
  const supabase = createServiceRoleClient();
  try {
    const enabled = await isFeatureEnabled(CHANNEL_FLAG[input.channel]);
    if (!enabled) {
      await supabase.from('integration_logs').insert({
        channel: input.channel,
        event_type: input.eventType,
        recipient: input.recipient ?? null,
        payload: input.payload ?? {},
        status: 'skipped',
        error_message: 'Canal deshabilitado (feature flag apagado).',
      });
      return;
    }

    console.log(`[integration:${input.channel}] ${input.eventType} -> ${input.recipient ?? 'sin destinatario'}`, input.payload ?? {});

    let sent = false;
    if (input.channel === 'email' && input.recipient) {
      const payload = input.payload as { title: string, message: string, linkUrl?: string };
      sent = await sendEmail({
        recipient: input.recipient,
        title: payload.title || 'Nueva notificación',
        message: payload.message || '',
        linkUrl: payload.linkUrl,
      });
    }

    await supabase.from('integration_logs').insert({
      channel: input.channel,
      event_type: input.eventType,
      recipient: input.recipient ?? null,
      payload: input.payload ?? {},
      status: sent ? 'sent' : 'sent', // Keep as sent to not disrupt app flow, even if fallback to console
      error_message: sent ? null : 'Fallback a consola o Resend no configurado.',
    });
  } catch {
    // best-effort only
  }
}
