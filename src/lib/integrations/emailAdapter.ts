import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function sendEmail({
  recipient,
  title,
  message,
  linkUrl,
}: {
  recipient: string;
  title: string;
  message: string;
  linkUrl?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('No RESEND_API_KEY set. Email skipped.');
    return false;
  }

  const resend = new Resend(apiKey);
  const supabase = createServiceRoleClient();
  let emails: string[] = [];

  if (recipient === 'admin_pjm') {
    const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'admin_pjm');
    if (admins) {
      emails = admins.map(a => a.email).filter(Boolean) as string[];
    }
  } else {
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', recipient).maybeSingle();
    if (profile?.email) {
      emails = [profile.email];
    }
  }

  if (emails.length === 0) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">${title}</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.5;">${message}</p>
      ${linkUrl ? `
        <div style="margin-top: 24px;">
          <a href="${siteUrl}${linkUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Ver detalles
          </a>
        </div>
      ` : ''}
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'PJM Notificaciones <onboarding@resend.dev>', // Should configure verified domain in production
      to: emails,
      subject: title,
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return false;
  }
}
