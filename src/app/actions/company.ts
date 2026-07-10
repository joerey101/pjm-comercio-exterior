'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';

export type CompanyFormState =
  | {
      message?: string;
      error?: string;
    }
  | undefined;

export async function updateCompany(_state: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  const user = await requireUser();
  const supabase = await createClient();

  const payload = {
    user_id: user.id,
    business_name: String(formData.get('businessName') ?? ''),
    cuit: String(formData.get('cuit') ?? ''),
    tax_condition: String(formData.get('taxCondition') ?? ''),
    address: String(formData.get('address') ?? ''),
    industry: String(formData.get('industry') ?? ''),
    import_frequency: String(formData.get('importFrequency') ?? ''),
    usual_transport_mode: String(formData.get('usualTransportMode') ?? ''),
    usual_products: String(formData.get('usualProducts') ?? ''),
  };

  const { data: existing } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();

  const { error } = existing
    ? await supabase.from('companies').update(payload).eq('id', existing.id)
    : await supabase.from('companies').insert(payload);

  const profileUpdate = {
    full_name: String(formData.get('fullName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    whatsapp: String(formData.get('whatsapp') ?? ''),
  };
  await supabase.from('profiles').update(profileUpdate).eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/perfil');
  return { message: 'Perfil actualizado correctamente.' };
}
