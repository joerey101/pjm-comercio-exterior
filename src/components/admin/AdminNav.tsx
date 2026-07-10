import Link from 'next/link';

const LINKS = [
  { href: '/admin', label: 'Solicitudes' },
  { href: '/admin/ncm', label: 'Catálogo NCM' },
  { href: '/admin/ncm/tributos', label: 'Parámetros tributarios' },
  { href: '/admin/ncm/intervenciones', label: 'Intervenciones' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/empresas', label: 'Empresas' },
  { href: '/admin/integraciones', label: 'Integraciones' },
];

export function AdminNav({ active }: { active: string }) {
  return (
    <nav className="flex gap-2 mb-8">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
            active === link.href
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
