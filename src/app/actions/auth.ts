'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginFormSchema, SignupFormSchema, type LoginFormState, type SignupFormState } from '@/lib/validations/auth';

export async function signup(_state: SignupFormState, formData: FormData): Promise<SignupFormState> {
  const validated = SignupFormSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    whatsapp: formData.get('whatsapp'),
    password: formData.get('password'),
    businessName: formData.get('businessName'),
    cuit: formData.get('cuit'),
    taxCondition: formData.get('taxCondition'),
    address: formData.get('address'),
    industry: formData.get('industry'),
    importFrequency: formData.get('importFrequency'),
    usualTransportMode: formData.get('usualTransportMode'),
    usualProducts: formData.get('usualProducts'),
    acceptedTerms: formData.get('acceptedTerms'),
    acceptedEstimateNotice: formData.get('acceptedEstimateNotice'),
    acceptedCommercialContact: formData.get('acceptedCommercialContact'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  const supabase = await createClient();

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        phone: data.phone,
        whatsapp: data.whatsapp || null,
        role: 'cliente',
        accepted_terms: true,
        accepted_estimate_notice: true,
        accepted_commercial_contact: data.acceptedCommercialContact === 'on',
      },
    },
  });

  if (error) {
    return { message: error.message };
  }

  const userId = signUpData.user?.id;
  if (userId) {
    await supabase.from('companies').insert({
      user_id: userId,
      business_name: data.businessName,
      cuit: data.cuit,
      tax_condition: data.taxCondition,
      address: data.address,
      industry: data.industry,
      import_frequency: data.importFrequency,
      usual_transport_mode: data.usualTransportMode,
      usual_products: data.usualProducts,
    });
  }

  if (!signUpData.session) {
    return { message: 'Cuenta creada. Revisá tu email para confirmar el registro antes de iniciar sesión.' };
  }

  redirect('/dashboard');
}

export async function login(_state: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const validated = LoginFormSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    return { message: 'Email o contraseña incorrectos.' };
  }

  const role = data.user?.user_metadata?.role;
  redirect(role === 'admin_pjm' ? '/admin' : '/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
