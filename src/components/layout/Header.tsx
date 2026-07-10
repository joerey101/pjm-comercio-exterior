import Link from 'next/link';
import { Globe2 } from 'lucide-react';
import { getCurrentProfile } from '@/lib/dal';
import { logout } from '@/app/actions/auth';
import { NotificationsBell } from '@/components/notifications/NotificationsBell';

export async function Header() {
  const profile = await getCurrentProfile();

  return (
    <header className="bg-slate-900 text-white shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
              PJM
            </span>
            <span className="text-xs block text-slate-400 font-semibold tracking-wider uppercase -mt-1">
              Comercio Exterior
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-sm font-semibold">
          {!profile && (
            <>
              <Link href="/simular" className="hidden sm:inline text-slate-300 hover:text-white transition-colors">
                Simular importación
              </Link>
              <Link href="/login" className="text-slate-300 hover:text-white transition-colors">
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Crear cuenta
              </Link>
            </>
          )}
          {profile && profile.role === 'cliente' && (
            <>
              <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/simulaciones/nueva" className="text-slate-300 hover:text-white transition-colors">
                Nueva simulación
              </Link>
              <Link href="/perfil" className="text-slate-300 hover:text-white transition-colors">
                Perfil
              </Link>
              <NotificationsBell />
              <form action={logout}>
                <button className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-200 transition-colors">
                  Cerrar sesión
                </button>
              </form>
            </>
          )}
          {profile && profile.role === 'admin_pjm' && (
            <>
              <Link href="/admin" className="text-slate-300 hover:text-white transition-colors">
                Panel PJM
              </Link>
              <NotificationsBell />
              <form action={logout}>
                <button className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-200 transition-colors">
                  Cerrar sesión
                </button>
              </form>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
