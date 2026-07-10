import { requireAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';
import { Badge } from '@/components/ui/Badge';
import type { ProfileRow } from '@/types/database';

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<ProfileRow[]>();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 w-full">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Panel PJM</h1>
      <p className="text-sm text-slate-500 mb-6">Usuarios registrados en la plataforma.</p>
      <AdminNav active="/admin/usuarios" />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Email</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(profiles ?? []).map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-semibold text-slate-800">{p.full_name || '—'}</td>
                <td className="p-3 text-slate-500">{p.email}</td>
                <td className="p-3 text-slate-500">{p.phone || '—'}</td>
                <td className="p-3">
                  <Badge tone={p.role === 'admin_pjm' ? 'indigo' : 'slate'}>{p.role}</Badge>
                </td>
                <td className="p-3 text-slate-500">{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
