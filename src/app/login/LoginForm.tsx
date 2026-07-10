'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login } from '@/app/actions/auth';
import { Field, inputClass } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <input id="email" name="email" type="email" required className={inputClass} placeholder="vos@empresa.com" />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={state?.errors?.password}>
        <input id="password" name="password" type="password" required className={inputClass} />
      </Field>

      {state?.message && <p className="text-sm text-rose-600 font-medium">{state.message}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Ingresando…' : 'Iniciar sesión'}
      </Button>

      <p className="text-center text-sm text-slate-500">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="text-indigo-600 font-semibold hover:underline">
          Creá una gratis
        </Link>
      </p>
    </form>
  );
}
