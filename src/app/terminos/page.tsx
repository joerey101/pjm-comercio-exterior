export default function TerminosPage() {
  return (
    <div className="flex-1 px-4 py-16">
      <div className="max-w-2xl mx-auto prose prose-slate">
        <h1 className="text-2xl font-extrabold text-slate-900">Términos y condiciones</h1>
        <p className="text-sm text-slate-600 mt-4">
          El uso del Cotizador Inteligente de Importación Argentina implica la aceptación de que los valores
          calculados por la plataforma son estimativos, se basan en los datos ingresados por el usuario y en
          parámetros de referencia cargados por PJM Comercio Exterior, y no constituyen una cotización formal,
          un compromiso comercial ni asesoramiento aduanero, impositivo o legal definitivo.
        </p>
        <p className="text-sm text-slate-600 mt-4">
          La posición arancelaria (NCM), los tributos, las intervenciones, los gastos logísticos, el tipo de
          cambio y las condiciones de pago deben ser validados por PJM Comercio Exterior antes de embarcar o
          contratar cualquier operación de comercio exterior.
        </p>
        <p className="text-sm text-slate-600 mt-4">
          Al registrarte, autorizás a PJM Comercio Exterior a almacenar tus datos y los de tu empresa para
          gestionar tus simulaciones y, si así lo aceptás, contactarte comercialmente.
        </p>
      </div>
    </div>
  );
}
