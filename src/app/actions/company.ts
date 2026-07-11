'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { mapDbError } from '@/lib/errorMessages';

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
    exempt_iva_additional: formData.get('exemptIvaAdditional') === 'on',
    exempt_ganancias: formData.get('exemptGanancias') === 'on',
    exempt_iibb: formData.get('exemptIibb') === 'on',
  };

  const { data: existing, error: fetchError } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (fetchError) return { error: mapDbError(fetchError.message) };

  const { error } = existing
    ? await supabase.from('companies').update(payload).eq('id', existing.id)
    : await supabase.from('companies').insert(payload);
  if (error) return { error: mapDbError(error.message) };

  const profileUpdate = {
    full_name: String(formData.get('fullName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    whatsapp: String(formData.get('whatsapp') ?? ''),
  };
  const { error: profileError } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
  if (profileError) return { error: mapDbError(profileError.message) };

  revalidatePath('/perfil');
  return { message: 'Perfil actualizado correctamente.' };
}
