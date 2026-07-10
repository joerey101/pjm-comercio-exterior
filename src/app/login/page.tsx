import { Card } from '@/components/ui/Card';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900">Iniciar sesión</h1>
          <p className="text-sm text-slate-500 mt-1">Accedé a tus simulaciones guardadas y al cotizador PJM.</p>
        </div>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </div>
  );
}
