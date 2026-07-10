import { PublicSimulator } from './PublicSimulator';

export default function SimularPage() {
  return (
    <div className="flex-1">
      <div className="bg-slate-900 text-white py-10 px-4 text-center">
        <h1 className="text-2xl font-extrabold">Simulá tu importación</h1>
        <p className="text-sm text-slate-300 mt-1">Sin registrarte. Los valores son estimativos y de referencia.</p>
      </div>
      <PublicSimulator />
    </div>
  );
}
