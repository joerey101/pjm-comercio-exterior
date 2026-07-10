import Link from 'next/link';
import { Ship, Plane, Truck, Container, Calculator, ShieldCheck, FileCheck2, Landmark } from 'lucide-react';
import { getCurrentProfile } from '@/lib/dal';

const FEATURES = [
  {
    icon: Calculator,
    title: 'Costo nacionalizado completo',
    description: 'FOB, flete, seguro, CIF, tributos, gastos locales, créditos fiscales y caja necesaria en un solo lugar.',
  },
  {
    icon: ShieldCheck,
    title: 'Posición arancelaria NCM',
    description: 'Cargá el NCM propuesto y dejalo pendiente de validación por nuestros especialistas antes de embarcar.',
  },
  {
    icon: FileCheck2,
    title: 'Checklist documental',
    description: 'Semáforos de riesgo para invoice, packing list, BL/AWB, certificado de origen y más.',
  },
  {
    icon: Landmark,
    title: 'Cotización formal PJM',
    description: 'Cuando estés listo, solicitá que nuestro equipo revise y emita una cotización formal.',
  },
];

const TRANSPORT_MODES = [
  { icon: Container, label: 'Marítimo FCL' },
  { icon: Ship, label: 'Marítimo LCL' },
  { icon: Plane, label: 'Aéreo' },
  { icon: Truck, label: 'Terrestre' },
];

export default async function HomePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex-1">
      <section className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block bg-indigo-600/20 text-indigo-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              Cotizador Inteligente de Importación Argentina
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Conocé el costo estimado de importar antes de embarcar
            </h1>
            <p className="text-slate-300 mt-4 text-base leading-relaxed">
              Flete, seguro, tributos, gastos locales, documentación y la caja necesaria para liberar tu
              mercadería en Argentina — todo en una sola simulación.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              {profile ? (
                <Link
                  href={profile.role === 'admin_pjm' ? '/admin' : '/dashboard'}
                  className="bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-xl font-bold transition-colors"
                >
                  Ir a mi dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/registro"
                    className="bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-xl font-bold transition-colors"
                  >
                    Crear cuenta
                  </Link>
                  <Link
                    href="/login"
                    className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl font-bold transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                </>
              )}
              <Link
                href="/simular"
                className="border border-slate-600 hover:border-slate-400 px-5 py-3 rounded-xl font-bold transition-colors"
              >
                Simular importación
              </Link>
            </div>
            <p className="text-xs text-slate-500 mt-6 max-w-md">
              Los cálculos son estimativos. Para guardar tu simulación, descargar el PDF preliminar o solicitar
              una cotización formal necesitás una cuenta gratuita.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-6 text-slate-900">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-400 mb-4">
              Elegí tu modalidad de transporte
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {TRANSPORT_MODES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="border-2 border-slate-100 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-colors"
                >
                  <Icon className="w-7 h-7 text-indigo-600 mb-2" />
                  <span className="text-xs font-bold">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">CIF</span>
                <span className="text-sm font-extrabold text-slate-800">FOB + Flete + Seguro</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Créditos</span>
                <span className="text-sm font-extrabold text-slate-800">IVA + Perc.</span>
              </div>
              <div className="bg-indigo-50 rounded-lg p-1.5">
                <span className="block text-[10px] font-bold text-indigo-500 uppercase">Caja necesaria</span>
                <span className="text-sm font-black text-indigo-700">El número clave</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-amber-50 border-y border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p className="text-xs sm:text-sm text-amber-800 font-medium">
            Los cálculos expuestos son estimativos y no constituyen cotización formal ni asesoramiento aduanero
            definitivo. La posición arancelaria, tributos, intervenciones, gastos logísticos, tipo de cambio y
            condiciones de pago deben ser validados por PJM Comercio Exterior antes de embarcar o contratar la
            operación.
          </p>
        </div>
      </section>
    </div>
  );
}
