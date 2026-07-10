import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { requireUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { SimulationWizard } from './SimulationWizard';

export default async function NuevaSimulacionPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 w-full">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg font-bold text-amber-900 mb-1">Completá el perfil de tu empresa</h1>
            <p className="text-sm text-amber-800 mb-4">
              Antes de crear una simulación necesitamos los datos de tu empresa (razón social, CUIT, domicilio,
              etc.) para poder asociarla y, más adelante, emitir una cotización formal.
            </p>
            <Link
              href="/perfil"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              Completar perfil de empresa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <SimulationWizard />;
}
