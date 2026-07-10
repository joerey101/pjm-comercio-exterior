import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ProfileRow } from '@/types/database';

/** Cached per-request: current authenticated Supabase user, or null. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Cached per-request: the user's `profiles` row (role, contact info, etc). */
export const getCurrentProfile = cache(async (): Promise<ProfileRow | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data as ProfileRow | null;
});

/** Redirects to /login if there is no authenticated session. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Redirects to /dashboard if the authenticated user is not admin_pjm. */
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (profile.role !== 'admin_pjm') redirect('/dashboard?error=forbidden');
  return profile;
}
