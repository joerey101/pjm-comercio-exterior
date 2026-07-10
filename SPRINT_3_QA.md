# Sprint 3 QA — Documentos + checklist + panel PJM robusto

Pruebas manuales contra un proyecto Supabase con `0001_init.sql` +
`0002_ncm_catalog.sql` + `0003_documents_checklist_admin.sql` +
`supabase/seed.sql` aplicados. Ver también `QA_CHECKLIST.md` (Sprint 1.5) y
`SPRINT_2_QA.md` (Sprint 2).

Preparación:
- [ ] Migración `0003_documents_checklist_admin.sql` aplicada sin errores.
- [ ] `npm run test` pasa en local (55 tests, incluye checklist/ready-for-quote de este sprint).
- [ ] Storage: el bucket `simulation-documents` existe (creado en `0001_init.sql`).

## Cliente

- [ ] Crear una simulación y solicitar cotización formal → al entrar de nuevo
      a `/simulaciones/[id]`, la pestaña "Checklist" ya tiene los 25 ítems
      (no vacío), agrupados por categoría, con semáforo en rojo (hay ítems
      bloqueantes pendientes: invoice, packing list, BL/AWB).
- [ ] Pestaña "Documentos": subir un invoice (PDF) → aparece en la lista con
      estado "Cargado" y un link "Ver documento" que abre el archivo.
- [ ] Intentar subir un archivo de más de 15MB o un `.exe` → error claro
      antes de tocar Supabase, no se sube nada.
- [ ] Marcar como completado un ítem no bloqueante del checklist (ej. "País
      de origen informado") → el checkbox queda tildado y el estado pasa a
      "Completado por el cliente".
- [ ] Intentar marcar como completado un ítem ya "Aprobado por PJM" → el
      checkbox está deshabilitado (el cliente no puede reabrir algo que PJM
      ya aprobó).
- [ ] Pestaña "Observaciones PJM": vacía hasta que un admin deje un
      comentario visible (ver sección Admin).

## Admin

- [ ] `/admin` muestra las tarjetas KPI (Nuevas, En revisión, Doc.
      incompleta, Listas para cotizar, Cotización enviada, Cerradas) con
      conteos correctos.
- [ ] Filtrar por estado y por prioridad desde los selectores → la lista
      (tabla en desktop, tarjetas en mobile) se actualiza vía URL
      (`?status=...&priority=...`).
- [ ] Entrar al detalle de una solicitud (`/admin/solicitudes/[id]`):
  - [ ] Pestaña "Resumen": cambiar "Estado de la solicitud" a
        "Esperando al cliente" sin comentario → bloqueado con mensaje
        "Para pedir algo al cliente, dejá un comentario...".
  - [ ] Repetir con comentario → el estado cambia, se crea un comentario
        `client_visible`, y el cliente ve la notificación (campanita) y el
        mensaje en su pestaña "Observaciones PJM".
  - [ ] Cambiar prioridad a "Urgente" → se refleja en la lista `/admin`.
  - [ ] "Asignarme" → aparece el nombre del admin logueado en "Asignado a".
  - [ ] Pestaña "Documentos": "Revisar documento" → "Observar" sin
        comentario → bloqueado. Con comentario → el documento pasa a
        "Observado", el cliente ve el comentario en su lista de documentos y
        recibe notificación.
  - [ ] Desde el cliente, "Reemplazar documento" sobre el documento
        observado → sube un archivo nuevo; en Supabase, el documento viejo
        queda `status = 'replaced'` y el nuevo referencia
        `replaces_document_id` al viejo. El viejo desaparece de ambas listas
        (cliente y admin filtran `status != 'replaced'`).
  - [ ] Pestaña "Checklist": "Revisar ítem" sobre uno bloqueante → "Aprobar"
        → el semáforo del checklist mejora (rojo → amarillo/verde según
        queden otros bloqueantes).
  - [ ] "Observar" un ítem sin comentario → bloqueado; con comentario →
        queda visible para el cliente en esa misma pestaña.
  - [ ] Pestaña "Comentarios": tildar "Visible para el cliente" al comentar
        → aparece para el cliente; sin tildar → sólo lo ven otros admins.
- [ ] "Marcar listo para cotización" con bloqueos pendientes (checklist
      bloqueante sin aprobar, o documento rechazado sin reemplazo, o NCM en
      `requiere_revision`) → error con la lista de motivos.
- [ ] "Marcar listo con observaciones" (aparece sólo cuando hay bloqueos) sin
      comentario → bloqueado; con comentario → la solicitud pasa a
      `ready_for_quote` y el comentario queda como nota interna.
- [ ] Resolver todos los bloqueos y volver a intentar "Marcar listo para
      cotización" (sin override) → funciona directo.

## Auditoría y notificaciones

- [ ] En Supabase, `audit_logs` tiene filas para: `formal_quote_requested`,
      `document_uploaded`, `document_observed`/`document_approved`/`document_rejected`,
      `checklist_item_completed`, `checklist_item_approved`/`checklist_item_observed`,
      `request_status_changed`, `request_assigned`, `priority_changed`,
      `ncm_validated`/`ncm_rejected` (ya existente desde Sprint 2),
      `comment_created`.
- [ ] Cada fila de `audit_logs` tiene `user_id` correcto (quien ejecutó la
      acción, cliente o admin según corresponda).
- [ ] `notifications`: subir un documento como cliente crea una notificación
      para **todos** los `admin_pjm`; una observación de PJM crea una
      notificación para el cliente dueño de la simulación.
- [ ] La campanita del header muestra el conteo de no leídas y al abrir la
      lista, "Marcar todas leídas" las limpia.

## RLS

- [ ] Un cliente no puede hacer `update` directo sobre `documents.status`
      (sólo `admin_pjm` tiene policy de update en esa tabla — confirmado
      también porque `DocumentReviewActions` sólo se renderiza en el panel
      admin).
- [ ] Un cliente puede "reemplazar" su propio documento (usa la función
      `replace_document`, no un `update` directo) pero no puede llamar esa
      función sobre un documento de otra simulación (prueba con dos
      usuarios distintos: A intenta `select public.replace_document(<id de
      documento de B>, <id propio>)` vía SQL Editor "Run as" A → error "not
      authorized").
- [ ] Un cliente no puede leer comentarios `internal` (ni los propios ni de
      otros) — sólo `client`.
- [ ] Un cliente no puede leer `audit_logs` en absoluto.
- [ ] Un cliente sólo ve sus propias `notifications`.
- [ ] `simulation_checklist_items`: un cliente puede hacer `update` para
      pasar de `pending` a `completed_by_client` (o viceversa) en un ítem de
      su propia simulación, pero un `update` intentando poner
      `status = 'approved_by_pjm'` directamente debe fallar (probar por SQL
      Editor "Run as" cliente).

## Build / lint / tests

- [ ] `npm run build` sin errores.
- [ ] `npm run lint` sin errores.
- [ ] `npm run test` — 55/55 tests unitarios en verde (incluye
      `computeChecklistStatus` y `computeReadyForQuoteBlockers`, las dos
      reglas de negocio centrales de este sprint).
