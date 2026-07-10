# Sprint 4 QA — Cotización comercial formal

Pruebas manuales contra un proyecto Supabase con `0001_init.sql` +
`0002_ncm_catalog.sql` + `0003_documents_checklist_admin.sql` +
`0004_formal_quotes.sql` + `supabase/seed.sql` aplicados. Ver también
`QA_CHECKLIST.md`, `SPRINT_2_QA.md` y `SPRINT_3_QA.md`.

Preparación:
- [ ] Migración `0004_formal_quotes.sql` aplicada sin errores.
- [ ] `npm run test` pasa en local (59 tests, incluye `computeQuoteTotals` de
      este sprint).

## Admin: crear y trabajar un borrador

- [ ] En `/admin/solicitudes/[id]`, pestaña "Cotización": si no hay
      cotización todavía, aparece "Crear borrador de cotización".
- [ ] Al crear el borrador, se copian los ítems de mercadería y un
      desglose de costos inicial (derechos, tasa estadística, IVA, IVA
      adicional, Ganancias, IIBB, gastos locales) tomados de la simulación
      actual — sólo los que sean mayores a 0.
- [ ] El total de la cotización (banda indigo al pie) se recalcula
      automáticamente al agregar/quitar un ítem o un costo.
- [ ] Editar condiciones de pago, vigencia (días), notas y exclusiones →
      "Guardar condiciones" persiste los cambios.
- [ ] Agregar un ítem de mercadería nuevo (descripción, NCM, cantidad,
      valor unitario) → aparece en la tabla y el total se actualiza.
- [ ] Agregar un costo comercial (categoría, concepto, monto) → aparece en
      la tabla de costos y el total se actualiza; sólo los costos con
      categoría "Impuestos" suman a `taxes_total`.
- [ ] Quitar un ítem o un costo → desaparece y el total se recalcula.
- [ ] "Aprobar borrador" sin ningún ítem de mercadería → bloqueado con
      mensaje claro.
- [ ] "Aprobar borrador" con al menos un ítem → la cotización pasa a
      "Aprobada (interna)"; ya no se pueden editar condiciones, ítems ni
      costos (los inputs quedan deshabilitados/ocultos).
- [ ] "Cancelar" un borrador o una cotización aprobada → pasa a
      "Cancelada" y desaparece de las acciones activas.

## Admin: emisión

- [ ] Con la cotización en estado "Aprobada (interna)", "Emitir y enviar
      al cliente" → la cotización pasa a "Enviada al cliente", obtiene un
      número con formato `COT-2026-0001` (correlativo por año) y queda
      `valid_until` calculado (fecha actual + días de vigencia).
- [ ] Emitir dos cotizaciones el mismo año → los números son correlativos
      y no se repiten (probar creando dos borradores distintos, o
      cancelando el primero y creando otro).
- [ ] Al emitir, la solicitud PJM (`pjm_requests.status`) pasa a
      `formal_quote_sent` y el cliente recibe una notificación in-app con
      link a `/simulaciones/[id]`.
- [ ] Desde la pestaña "Cotización" en admin, con la cotización ya
      emitida, "Ver PDF de la cotización" abre
      `/simulaciones/[id]/cotizacion/pdf` con el detalle completo
      (mercadería, costos, condiciones, total, número, vigencia).

## Cliente

- [ ] En `/simulaciones/[id]`, pestaña "Cotización formal": antes de la
      emisión, muestra un mensaje de que todavía no hay cotización.
- [ ] Una vez emitida, el cliente ve la tarjeta de cotización (número,
      total, condiciones de pago, vigencia, link al PDF) y el formulario
      de respuesta (Aceptar / Rechazar).
- [ ] "Aceptar cotización" → el estado pasa a "Aceptada por el cliente";
      el formulario de respuesta desaparece (ya no se puede volver a
      responder). Los admins reciben una notificación in-app.
- [ ] "Rechazar" con un comentario → el estado pasa a "Rechazada por el
      cliente" y el comentario queda guardado en
      `client_response_notes`; notificación a los admins.
- [ ] El cliente no puede ver una cotización en estado "Borrador" o
      "Aprobada (interna)" — sólo aparece en su pestaña una vez "Enviada
      al cliente" o posterior (confirmar que no aparece nada hasta la
      emisión).

## Auditoría

- [ ] `audit_logs` registra `formal_quote_draft_created`,
      `formal_quote_approved`, `formal_quote_issued` (con el número
      generado en `new_value`), `formal_quote_accepted` /
      `formal_quote_rejected`, y `formal_quote_cancelled`.

## RLS

- [ ] Un cliente no puede hacer `select` sobre una cotización en estado
      `draft` o `approved` de su propia simulación (probar por SQL Editor
      "Run as" cliente: `select * from formal_quotes where simulation_id =
      '<id>'` sólo devuelve filas con `status` distinto de esos dos).
- [ ] Un cliente no puede hacer `update` directo poniendo `status =
      'issued'` o `status = 'approved'` sobre su propia cotización (sólo
      `accepted`/`rejected` están permitidos, y sólo si el estado actual
      es `issued`).
- [ ] Un cliente no puede editar `formal_quote_items` ni
      `formal_quote_costs` (sólo `select`, vía política que depende del
      estado de la cotización padre).
- [ ] Llamar a `issue_formal_quote(<id de una cotización en estado
      draft>)` como admin → error "quote must be approved before
      issuance".
- [ ] Llamar a `issue_formal_quote` como cliente (aunque sea sobre su
      propia cotización) → error "not authorized".

## Build / lint / tests

- [ ] `npm run build` sin errores.
- [ ] `npm run lint` sin errores.
- [ ] `npm run test` — 59/59 tests unitarios en verde (incluye
      `computeQuoteTotals`, la regla de negocio central de este sprint).

## Decisión de alcance: PDF

El PDF comercial se genera con el mismo patrón que el PDF preliminar del
Sprint 1 (ruta imprimible `/simulaciones/[id]/cotizacion/pdf` + "Imprimir
/ Guardar PDF" del navegador), en vez de sumar una dependencia de
renderizado de PDF (`@react-pdf/renderer` u otra). Mantiene el sprint sin
una dependencia nueva y sin lógica de layout duplicada entre servidor y
librería de PDF; queda como mejora futura si se necesita un PDF con
membrete/diseño más avanzado fuera del navegador.
