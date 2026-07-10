# PR: PJM Cotizador Inteligente de Importación Argentina — MVP + Sprints 2–5 (+ hardening)

> Texto listo para pegar al abrir el Pull Request.
> **Rama sugerida (proyecto original):** `claude/cotizador-importacion-argentina-h2uxfi`
> **En este repo (`joerey101/pjm-comercio-exterior`):** el trabajo ya está integrado en `main` y desplegado; esta descripción documenta el alcance completo para revisión.

---

## Resumen ejecutivo

Plataforma web (Next.js 16 + Supabase) para simular el **costo nacionalizado de una importación en Argentina** y gestionar el flujo con PJM Comercio Exterior: registro de clientes importadores, wizard de simulación con motor de cálculo (FOB → CIF → tributos → percepciones → créditos fiscales → caja necesaria), guardado de operaciones, PDF preliminar, solicitud y emisión de cotización formal numerada, documentos, checklist y panel interno PJM.

Estado: **Release Candidate v0.1**, en producción en https://pjm-comercio-exterior.vercel.app.

## Alcance implementado

- **MVP + Sprint 1.5:** esquema base con RLS, motor de cálculo puro y testeado, auth, wizard, dashboard, PDF preliminar.
- **Sprint 2:** catálogo NCM versionado/parametrizable, parámetros de tributos, reglas de intervención, importadores CSV, validaciones NCM.
- **Sprint 3:** ciclo de vida de documentos, checklist operativo, panel PJM, auditoría, notificaciones.
- **Sprint 4:** cotización formal numerada (`COT-AAAA-NNNN`) con snapshot congelado, aprobación/emisión y respuesta del cliente.
- **Sprint 5:** feature flags, tipos de cambio, referencias regulatorias, log de notificaciones, health center, 2 cron jobs.
- **Sprint 6 (hardening):** cierre de escalada de privilegios (rol nunca decidido desde el cliente), 3 fixes de migración, fix del guardado de empresa en el registro, security headers.

## Cómo probar

```bash
nvm use 22 && npm ci
cp .env.example .env.local   # completar con Supabase
npm run test    # 63/63
npm run lint
npm run build
npm run dev     # http://localhost:3000
```

Flujo end-to-end: registrarse → login → wizard de simulación → guardar → PDF → solicitar cotización formal → (como `admin_pjm`) gestionar en `/admin` → emitir cotización → (como cliente) aceptar/rechazar. Ver checklist de QA completo en `RELEASE_CANDIDATE_v0.1.md` §13.

## Migraciones

`supabase/migrations/0001`–`0006` (esquema base, catálogo NCM, documentos/checklist/panel, cotizaciones formales, integraciones, security hardening). Setup desde cero: `supabase/_bundle_full_setup.sql`.

## Variables de entorno necesarias

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (ver `.env.example` y `RELEASE_CANDIDATE_v0.1.md` §5).

## Buckets / feature flags

- Bucket `simulation-documents` (privado).
- Feature flags: `email_notifications`, `whatsapp_notifications`, `webhook_notifications` (OFF por defecto).

## Screenshots

_Pendientes de adjuntar_: dashboard del cliente, wizard de simulación, PDF preliminar, panel `/admin`, cotización formal emitida.

## Checklist de QA

- [ ] Registro crea perfil + empresa
- [ ] Login / logout / protección de rutas
- [ ] Simulador público calcula sin login
- [ ] Wizard completo + totales coherentes
- [ ] PDF preliminar
- [ ] Solicitud y emisión de cotización formal (numeración)
- [ ] Panel admin: estados, comentarios, validación NCM
- [ ] Un `cliente` NO puede autopromoverse a `admin_pjm`
- [ ] Security headers presentes
- [ ] Build/lint/tests en verde

## Riesgos conocidos

Registro abierto sin confirmación de email, catálogo NCM semilla (ilustrativo), sin tests de Server Actions, CSP con `unsafe-inline`. Detalle completo en `RELEASE_CANDIDATE_v0.1.md` §15.
