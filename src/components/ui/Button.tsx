import { forwardRef } from 'react';

const VARIANT_CLASSES = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:bg-indigo-300',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white disabled:bg-rose-300',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 disabled:opacity-50',
} as const;

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANT_CLASSES }
>(function Button({ variant = 'primary', className = '', ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
});
