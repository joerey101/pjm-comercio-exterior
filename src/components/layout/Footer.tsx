export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 no-print mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs space-y-2">
        <p className="font-semibold text-slate-300">PJM Comercio Exterior — Cotizador Inteligente de Importación Argentina</p>
        <p className="max-w-3xl mx-auto">
          Los cálculos expuestos son estimativos y no constituyen cotización formal ni asesoramiento aduanero
          definitivo. La posición arancelaria, tributos, intervenciones, gastos logísticos, tipo de cambio y
          condiciones de pago deben ser validados por PJM Comercio Exterior antes de embarcar o contratar la
          operación.
        </p>
        <p className="text-slate-600">&copy; {new Date().getFullYear()} PJM Comercio Exterior. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
