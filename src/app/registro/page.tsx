import { SignupForm } from './SignupForm';

export default function RegistroPage() {
  return (
    <div className="flex-1 px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900">Creá tu cuenta</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registrate para guardar simulaciones, descargar el PDF preliminar y solicitar cotización formal a PJM.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
