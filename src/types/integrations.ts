export type IntegrationChannel = 'email' | 'whatsapp' | 'webhook';
export type IntegrationLogStatus = 'sent' | 'failed' | 'skipped';
export type RegulatoryReferenceCategory = 'bcra' | 'vuce' | 'arca' | 'other';

export const INTEGRATION_CHANNEL_LABELS: Record<IntegrationChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  webhook: 'Webhook',
};

export const REGULATORY_REFERENCE_CATEGORY_LABELS: Record<RegulatoryReferenceCategory, string> = {
  bcra: 'BCRA',
  vuce: 'VUCE',
  arca: 'ARCA',
  other: 'Otro',
};

export const FEATURE_FLAG_KEYS = ['email_notifications', 'whatsapp_notifications', 'webhook_notifications'] as const;
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];
