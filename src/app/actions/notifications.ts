'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/dal';
import type { NotificationRow } from '@/types/database';

export async function listNotifications(limit = 20): Promise<NotificationRow[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<NotificationRow[]>();
  return data ?? [];
}

export async function countUnreadNotifications(): Promise<number> {
  const user = await requireUser();
  const supabase = await createClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('user_id', user.id);
  revalidatePath('/dashboard');
  revalidatePath('/admin');
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
  revalidatePath('/dashboard');
  revalidatePath('/admin');
}
