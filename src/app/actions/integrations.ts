'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';
import { mapDbError } from '@/lib/errorMessages';
import type { FeatureFlagKey, RegulatoryReferenceCategory } from '@/types/integrations';

type ActionResult = { ok: true } | { error: string };

export async function toggleFeatureFlag(key: FeatureFlagKey, enabled: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('feature_flags').update({ enabled, updated_by: admin.id }).eq('key', key);
  if (error) return { error: mapDbError(error.message) };
  revalidatePath('/admin/integraciones');
  return { ok: true };
}

export async function addExchangeRate(input: {
  rateDate: string;
  currency: string;
  buyRate: number;
  sellRate: number;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('exchange_rates').upsert(
    {
      rate_date: input.rateDate,
      currency: input.currency,
      buy_rate: input.buyRate,
      sell_rate: input.sellRate,
      source: 'manual_bna',
      created_by: admin.id,
    },
    { onConflict: 'rate_date,currency' }
  );
  if (error) return { error: mapDbError(error.message) };
  revalidatePath('/admin/integraciones');
  return { ok: true };
}

export async function addRegulatoryReference(input: {
  category: RegulatoryReferenceCategory;
  title: string;
  description: string | null;
  url: string | null;
  ncmCode: string | null;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('regulatory_references').insert({
    category: input.category,
    title: input.title,
    description: input.description,
    url: input.url,
    ncm_code: input.ncmCode,
    created_by: admin.id,
  });
  if (error) return { error: mapDbError(error.message) };
  revalidatePath('/admin/integraciones');
  return { ok: true };
}

export async function toggleRegulatoryReference(id: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('regulatory_references').update({ is_active: isActive }).eq('id', id);
  if (error) return { error: mapDbError(error.message) };
  revalidatePath('/admin/integraciones');
  return { ok: true };
}

export async function deleteRegulatoryReference(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('regulatory_references').delete().eq('id', id);
  if (error) return { error: mapDbError(error.message) };
  revalidatePath('/admin/integraciones');
  return { ok: true };
}
