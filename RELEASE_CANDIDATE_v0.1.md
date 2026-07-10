# Release Candidate v0.1 — PJM Cotizador Inteligente de Importación Argentina

> **Estado:** Release Candidate — listo para revisión humana, PR y deploy de staging.
> **Fecha:** 10 de julio de 2026
> **Producción actual:** https://pjm-comercio-exterior.vercel.app
> **Repositorio:** https://github.com/joerey101/pjm-comercio-exterior (branch `main`)
> **Alcance de este documento:** solo documentación, checklist y preparación de release. No introduce cambios de features.

---

## 1. Estado general del proyecto

MVP funcional y desplegado de una plataforma para simular el **costo nacionalizado de una importación en Argentina** (FOB → flete → seguro → CIF → tributos → percepciones → créditos fiscales → costo definitivo → caja necesaria), con registro de clientes importadores, guardado de operaciones, generación de PDF preliminar, solicitud de cotización formal y un panel interno para PJM.

- **Build:** verde (Next.js 16, 22 rutas, Node 22).
- **Tests:** 63/63 en verde (motor de cálculo + lógica de dominio, `vitest`).
- **Lint / typecheck:** sin errores.
- **Base de datos:** 6 migraciones aplicadas + seed de catálogo (7 posiciones NCM, 7 juegos de tributos, 3 feature flags).
- **Seguridad:** RLS en todas las tablas; escalada de privilegios cerrada (`0006`); security headers activos.
- **Deploy:** Vercel (plan Hobby) + Supabase (Auth/Postgres/Storage), verificado en vivo.

---

## 2. Qué quedó construido, por sprint

| Sprint | Commit | Contenido |
|---|---|---|
| **1 — MVP** | `6544867` | Esquema base (perfiles, empresas, simulaciones, ítems, costos logísticos, documentos, solicitudes PJM, comentarios). Motor de cálculo portado del prototipo HTML + fórmulas de nacionalización AR. Auth, registro, wizard de simulación, dashboard, PDF preliminar. |
| **1.5 — Estabilización** | `e08705b` | Endurecimiento de RLS e índices, superficie de errores, docs de QA. |
| **2 — Catálogo NCM** | `17e5deb` | Catálogo NCM real, versionado y parametrizable; parámetros de tributos; reglas de intervención (ANMAT/SENASA/etc.); jobs de importación; validaciones NCM. |
| **3 — Documentos y panel** | `a3057cc` | Ciclo de vida de documentos (subida/revisión/versionado), checklist operativo, panel PJM robusto, auditoría (`audit_logs`), notificaciones. |
| **4 — Cotización formal** | `236c4bf` | Cotizaciones formales numeradas (`COT-AAAA-NNNN`) con snapshot congelado, flujo de aprobación/emisión y respuesta del cliente (aceptar/rechazar). |
| **5 — Integraciones** | `b63c0d5` | Feature flags, tipos de cambio manuales, referencias regulatorias (BCRA/VUCE), log unificado de notificaciones salientes, health center, 2 cron jobs de expiración. |
| **6 — Security hardening** | `60fb0a1` | Cierre de escalada de privilegios (rol nunca decidido desde el cliente), corrección de 3 bugs de migración, fix del guardado de empresa en el registro, security headers. |

---

## 3. Principales archivos / módulos

```
src/
  app/
    actions/            Server Actions (auth, quotes, simulations, documents, ncm, admin, etc.)
    (rutas)             login, registro, dashboard, simular (público), simulaciones/*, admin/*, perfil
    api/cron/           expire-documents, expire-formal-quotes
  components/           UI por dominio (simulation, ncm, documents, checklist, quotes, admin, ...)
  lib/
    calculations/importCostCalculator.ts   Motor de cálculo puro (testeado) — CORAZÓN del sistema
    supabase/           Clientes browser / server / service-role + sesión (proxy)
    dal.ts              Data Access Layer (getCurrentUser/Profile, requireUser/requireAdmin)
    ncm/                Búsqueda, normalización, matching de NCM y tributos, importadores CSV
    cron.ts             Validación de requests de cron (Bearer CRON_SECRET)
  proxy.ts              Middleware Next.js 16 (protección de rutas + refresh de sesión)
supabase/
  migrations/0001..0006 Esquema completo + RLS
  seed.sql              Catálogo NCM / tributos de ejemplo
  _bundle_full_setup.sql  Setup completo desde cero (migraciones + seed) para SQL Editor
  _reset_recovery.sql   Reset del schema public (recuperación)
```

---

## 4. Migraciones aplicadas

| # | Archivo | Descripción |
|---|---|---|
| 0001 | `0001_init.sql` | Esquema base + RLS + trigger de perfil + bucket de storage |
| 0002 | `0002_ncm_catalog.sql` | Catálogo NCM versionado, tributos, reglas de intervención, jobs de import |
| 0003 | `0003_documents_checklist_admin.sql` | Documentos, checklist, auditoría, notificaciones, panel |
| 0004 | `0004_formal_quotes.sql` | Cotizaciones formales, ítems/costos snapshot, numeración atómica |
| 0005 | `0005_integrations.sql` | Feature flags, tipos de cambio, referencias regulatorias, logs de integración |
| 0006 | `0006_security_hardening.sql` | Rol no decidible desde el cliente (anti escalada de privilegios) |

> Setup desde cero: pegar `supabase/_bundle_full_setup.sql` en el SQL Editor. Recuperación: `supabase/_reset_recovery.sql`.

---

## 5. Variables de entorno necesarias

Ver `.env.example`. Cuatro variables:

| Variable | Uso | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | **sin** `/rest/v1` ni ruta al final |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (browser) | pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (server-only) | **secreta**, nunca al cliente |
| `CRON_SECRET` | Auth de `/api/cron/*` | Vercel Cron manda `Authorization: Bearer <CRON_SECRET>` |

> `.env.local` está en `.gitignore` (`.env*`). Nunca commitear claves.

---

## 6. Buckets de Supabase requeridos

| Bucket | Público | Uso |
|---|---|---|
| `simulation-documents` | No (privado) | Documentos de las simulaciones (facturas, BL/AWB, fichas técnicas, etc.). Se crea en `0001` con políticas de acceso por dueño/admin. |

---

## 7. Feature flags disponibles

Definidos en `0005` (tabla `feature_flags`, editables desde el health center admin). Todos **OFF** por defecto:

| Key | Descripción |
|---|---|
| `email_notifications` | Envío de emails salientes (además de la notificación in-app) |
| `whatsapp_notifications` | Envío de mensajes de WhatsApp salientes |
| `webhook_notifications` | Disparo de webhooks salientes a sistemas externos |

> Los adapters de estos canales usan un fallback a consola/log cuando no hay proveedor real configurado.

---

## 8. Cómo correr local

```bash
nvm use 22          # Node 22 es REQUISITO (supabase-js usa WebSocket nativo de Node 22)
npm ci
cp .env.example .env.local   # completar con los valores del proyecto Supabase
npm run dev         # http://localhost:3000
```

---

## 9. Cómo configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com/dashboard) (región sugerida: South America / São Paulo).
2. **SQL Editor** → pegar y ejecutar `supabase/_bundle_full_setup.sql` (crea esquema + seed).
3. **Project Settings → API Keys / Data API** → copiar Project URL, publishable key y secret key al `.env.local`.
4. (Opcional para pruebas) desactivar *Authentication → Email → Confirm email* para altas instantáneas.

---

## 10. Cómo aplicar migraciones

**Opción A — SQL Editor (simple):** pegar `supabase/_bundle_full_setup.sql` (incluye 0001–0006 + seed).

**Opción B — Supabase CLI:**
```bash
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase db execute -f supabase/seed.sql --linked
```

---

## 11. Cómo crear un usuario `admin_pjm`

El rol **no** se puede asignar desde la app (por diseño, `0006`). Proceso seguro:

1. El usuario se registra normalmente por `/registro`.
2. En Supabase → **SQL Editor** (corre como superusuario, `auth.uid()` null → el trigger de seguridad lo permite):
```sql
update public.profiles set role = 'admin_pjm' where email = '<email>';
```
3. Aplica en el siguiente request (el gate de `/admin` lee `profiles.role`, no el JWT).

> El script `scripts/seed-demo-users.mjs` crea usuarios demo **solo para dev/staging** (contraseña pública). No usar en producción.

---

## 12. Cómo correr tests / lint / build

```bash
npm run test        # vitest — 63 tests
npm run lint        # eslint
npx tsc --noEmit    # typecheck
npm run build       # build de producción
```

---

## 13. Checklist de QA manual

- [ ] Registro de un cliente nuevo → se crea perfil (`cliente`) y **empresa** asociada.
- [ ] Login / logout.
- [ ] Ruta protegida sin sesión (`/dashboard`) → redirige a `/login?redirect=...`.
- [ ] Simulador público `/simular` → calcula sin necesidad de login.
- [ ] Wizard de simulación completo (operación → mercadería → NCM → logística → tributos → checklist) → totales coherentes.
- [ ] Guardar simulación → aparece en dashboard con estado.
- [ ] Generar PDF preliminar de la simulación.
- [ ] Solicitar cotización formal a PJM → cambia estado a "enviada a PJM".
- [ ] Login como `admin_pjm` → panel `/admin`, listado de solicitudes, cambio de estados, comentarios.
- [ ] Cotización formal: crear borrador → aprobar → emitir (numeración `COT-AAAA-NNNN`) → cliente ve la emitida y puede aceptar/rechazar.
- [ ] Un `cliente` NO puede promoverse a `admin_pjm` (RLS lo bloquea).
- [ ] Security headers presentes en las respuestas.

---

## 14. Pasos para deploy en Vercel (resumen)

Guía completa en `DEPLOY.md`. Resumen:

1. Push del repo a GitHub (branch `main`).
2. Importar en Vercel → framework Next.js autodetectado → **Node.js Version 22.x**.
3. Cargar las 4 env vars (sección 5) en Production + Preview.
4. **Supabase → Authentication → URL Configuration:** Site URL y Redirect URLs al dominio de Vercel (sin esto, la confirmación de email y los redirects apuntan a `localhost`).
5. Decidir *Confirm email* (ON + SMTP propio recomendado para prod).
6. Eliminar usuarios demo si se reusa el proyecto Supabase de pruebas.
7. Deploy → verificar rutas, login, PDF, crons y headers.

---

## 15. Limitaciones actuales / Riesgos conocidos

- **Registro abierto:** en producción *Confirm email* está OFF y las altas están habilitadas → cualquiera puede registrarse con un email falso. Recomendado activar confirmación + SMTP propio, o validar altas manualmente.
- **Sin SMTP propio:** el email transaccional depende del SMTP por defecto de Supabase (límites bajos).
- **Datos de referencia semilla:** el catálogo NCM/tributos es ilustrativo (7 posiciones). No sustituye una fuente MERCOSUR/AEC/ARCA real.
- **Sin rate limiting propio:** se apoya en los límites nativos de Supabase Auth. El simulador público es cálculo puro (sin BD), sin vector de abuso relevante.
- **Rol admin único / manual:** la promoción es manual por SQL; no hay UI de gestión de roles ni segundo rol (despachante) separado del admin.
- **CSP con `unsafe-inline`:** necesario por los scripts inline de Next sin nonces; endurecer a nonces es un paso posterior.
- **Región Supabase:** el proyecto actual está en West US (Oregon); São Paulo daría menos latencia para AR (implica recrear el proyecto).
- **Sin tests de Server Actions:** los tests cubren el motor de cálculo y la lógica pura, no las mutaciones/autorización de las actions.
- **Dashboard:** "Costo total est." y "Caja necesaria" pueden mostrar el mismo valor; conviene exponer por separado el *costo económico* del recuperable.

---

## 16. Backlog recomendado (post-RC)

1. Confirmación de email + SMTP propio (Resend/SendGrid) para producción.
2. Fuente real de catálogo NCM / tributos (importadores CSV ya existen; falta el feed).
3. Tests de Server Actions (autorización + mutaciones críticas).
4. Endurecer CSP a nonces.
5. Rol de despachante/especialista aduanero separado de `admin_pjm` (permisos granulares).
6. Doble aprobación de cotización formal (quien arma ≠ quien aprueba).
7. Dashboard: separar costo económico vs. créditos fiscales / caja.
8. Rate limiting propio (Upstash) si aparece tráfico de abuso.
9. Observabilidad (logs/errores) y backups/retención en Supabase.

---

## 17. Próximos pasos manuales (staging / revisión)

- Abrir PR con el contenido de `PULL_REQUEST_DESCRIPTION.md` (cuando GitHub esté conectado).
- Deploy de **preview/staging** en Vercel desde una rama.
- Proyecto Supabase de **staging** separado + aplicar migraciones.
- Recorrer el checklist de QA (sección 13) end-to-end.
- Demo interna con PJM.
