import { requireUser, getCurrentProfile } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { PerfilForm } from './PerfilForm';
import type { CompanyRow } from '@/types/database';

export default async function PerfilPage() {
  await requireUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', profile!.id)
    .maybeSingle<CompanyRow>();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 w-full">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Perfil de cliente y empresa</h1>
      <p className="text-sm text-slate-500 mb-8">Estos datos se usan en tus simulaciones y en el PDF preliminar.</p>
      <PerfilForm profile={profile!} company={company ?? null} />
    </div>
  );
}
