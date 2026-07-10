# Sprint 5 QA — Integraciones, feature flags y health center

Pruebas manuales contra un proyecto Supabase con `0001_init.sql` a
`0005_integrations.sql` + `supabase/seed.sql` aplicados. Ver también
`QA_CHECKLIST.md`, `SPRINT_2_QA.md`, `SPRINT_3_QA.md` y `SPRINT_4_QA.md`.

Preparación:
- [ ] Migración `0005_integrations.sql` aplicada sin errores; `feature_flags`
      tiene 3 filas (`email_notifications`, `whatsapp_notifications`,
      `webhook_notifications`), las tres en `enabled = false` por defecto.
- [ ] `npm run test` pasa en local (63 tests, incluye `isAuthorizedCronRequest`
      de este sprint).
- [ ] Variable de entorno `CRON_SECRET` configurada en `.env.local` (podés
      generar cualquier string, ej. `openssl rand -hex 24`).

## Health center (`/admin/integraciones`)

- [ ] La página carga y muestra cuatro bloques: Feature flags, Tipo de
      cambio (BNA), Referencias BCRA/VUCE, Catálogo NCM (ARCA), y una tabla
      de "Últimos intentos de notificación saliente".
- [ ] Tildar `email_notifications` → queda activado (persiste al recargar
      la página).

## Adapters con fallback (email/WhatsApp/webhook)

- [ ] Con `email_notifications` **apagado**: disparar cualquier evento que
      notifique (ej. subir un documento como cliente) → en
      `/admin/integraciones`, la tabla de notificaciones salientes muestra
      una fila `email` / `skipped` con motivo "Canal deshabilitado".
- [ ] Activar `email_notifications` y repetir la acción → la fila pasa a
      `email` / `sent`, con nota de que es un fallback a consola (no hay
      proveedor real). En los logs del servidor (`npm run dev` en la
      terminal) aparece la línea `[integration:email] ...`.
- [ ] `whatsapp_notifications` y `webhook_notifications` no tienen ningún
      punto de disparo automático en este sprint (no hay eventos de
      WhatsApp/webhook conectados todavía) — confirmar que el toggle
      igual persiste sin errores; quedan listos para un futuro punto de
      integración sin cambiar el esquema.

## BNA — tipo de cambio manual

- [ ] Cargar un tipo de cambio (fecha, moneda, compra, venta) desde el
      health center → aparece en la lista debajo del formulario.
- [ ] Cargar un segundo tipo de cambio con la misma fecha y moneda → se
      actualiza el existente en vez de duplicar (unique en
      `rate_date, currency`).
- [ ] En un borrador de cotización formal (`/admin/solicitudes/[id]`,
      pestaña Cotización), aparece el botón "Usar último TC BNA (…)" con
      el valor y la fecha cargados → al hacer clic, `formal_quotes.exchange_rate`
      queda fijado a ese valor (visible en "Tipo de cambio (BNA)").
- [ ] Una vez que la cotización deja de ser `draft` (aprobada/emitida), el
      botón desaparece — el tipo de cambio queda congelado (snapshot) aunque
      se carguen nuevos valores de BNA después.

## BCRA / VUCE — referencias

- [ ] Agregar una referencia (categoría, título, NCM opcional, URL
      opcional, descripción) desde el health center → aparece en la lista.
- [ ] "Desactivar" una referencia → sigue visible para el admin (con la
      etiqueta de estado invertida a "Activar") pero un cliente ya no
      podría leerla (ver sección RLS).
- [ ] "Eliminar" una referencia → desaparece de la lista.

## ARCA — carga manual del catálogo

- [ ] El link "Ir al importador de catálogo NCM" en el health center lleva
      a `/admin/ncm`, el mismo importador de posiciones/tributos/
      intervenciones del Sprint 2 — no hay una pantalla separada para
      "ARCA": es el mismo flujo, marcando `source = 'arca'` en el CSV/
      formulario de importación si corresponde.

## Cron routes

- [ ] `curl` sin header de autorización a `/api/cron/expire-formal-quotes`
      (local: `http://localhost:3000/api/cron/expire-formal-quotes`) →
      responde `401 {"error":"unauthorized"}`.
- [ ] `curl -H "Authorization: Bearer <CRON_SECRET>"` al mismo endpoint →
      responde `200` con `{"expired": N}`.
- [ ] Preparar una cotización `issued` con `valid_until` en el pasado
      (se puede editar la fila directo en Supabase para la prueba) →
      correr el cron de arriba → esa cotización pasa a `status = 'expired'`.
- [ ] Ídem con `/api/cron/expire-documents`: un documento con `expires_at`
      en el pasado y estado `approved`/`uploaded`/`pending_review` pasa a
      `expired` al correr el cron.
- [ ] `vercel.json` en la raíz del repo define los dos crons con schedule
      diario (`0 6 * * *`); en producción, Vercel agrega automáticamente el
      header `Authorization: Bearer $CRON_SECRET` si la env var está
      configurada en el proyecto de Vercel.

## RLS

- [ ] `feature_flags`, `exchange_rates`, `integration_logs`: un cliente no
      puede hacer `select` sobre ninguna de las tres (probar por SQL
      Editor "Run as" cliente).
- [ ] `regulatory_references`: un cliente puede `select` filas con
      `is_active = true`, pero no ve las desactivadas ni puede
      `insert`/`update`/`delete`.

## Build / lint / tests

- [ ] `npm run build` sin errores.
- [ ] `npm run lint` sin errores.
- [ ] `npm run test` — 63/63 tests unitarios en verde.

## Decisiones de alcance de este sprint

- **Sin proveedores reales**: no se agregó ninguna dependencia ni
  credencial de email/WhatsApp/webhooks. El "adapter" es una función que
  respeta el feature flag y cae a `console.log` + `integration_logs`
  cuando no hay proveedor configurado — eso es intencional y documentado,
  no un placeholder olvidado.
- **ARCA/BCRA/VUCE sin API real**: se reutiliza el importador CSV del
  Sprint 2 para ARCA (ya soporta marcar la fuente del lote) y se agregó
  una tabla de referencias de carga 100% manual para BCRA/VUCE — no hay
  scraping ni consumo de ninguna API pública, según el alcance acordado.
- **`integration_logs` unificada**: en vez de tres tablas separadas
  (`email_logs`, `whatsapp_message_logs`, `webhook_events`) del detalle
  original del sprint, se usa una sola tabla con columna `channel`,
  siguiendo el mismo criterio de condensación aplicado en sprints
  anteriores (ej. `formal_quotes` con snapshot embebido en vez de tablas
  de términos/snapshots separadas).
