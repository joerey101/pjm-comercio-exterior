import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('formal_quotes')
    .update({ status: 'expired' })
    .eq('status', 'issued')
    .lt('valid_until', today)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expired: data?.length ?? 0 });
}
