export function Card({
  children,
  className = '',
  step,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
  title?: string;
}) {
  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      {title && (
        <div className="flex items-center space-x-3 mb-6">
          {step !== undefined && (
            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
              {step}
            </span>
          )}
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
}
