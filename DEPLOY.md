# Guía de Deploy — PJM Cotizador de Importación → Vercel

> **Para el agente que ejecute esto:** este documento es autocontenido. Seguí los pasos en orden.
> No inventes valores; donde diga "pedir al usuario" o "copiar de X", hacelo. No commitees secretos.
> Detené el turno y preguntá al usuario si un paso requiere una credencial o una decisión que no tenés.

---

## 0. Contexto del proyecto (leer antes de empezar)

- **App:** "PJM Cotizador Inteligente de Importación Argentina". Simula el costo nacionalizado de una importación (FOB → CIF → tributos → créditos fiscales → caja necesaria), con login de clientes, panel admin PJM, cotización formal numerada, documentos y checklist.
- **Stack:** Next.js 16 (App Router; el middleware vive en `src/proxy.ts`, no `middleware.ts`) · React 19 · Tailwind 4 · Supabase (Auth + Postgres con RLS + Storage). Objetivo de deploy: **Vercel**.
- **⚠️ Node 22 es REQUISITO.** `@supabase/supabase-js` 2.110 usa el WebSocket nativo de Node 22; en Node 20 la app crashea. Ya está declarado en `package.json` (`engines.node >=22`) y en `.nvmrc` (`22`).
- **Estado actual (ya hecho y verificado en local):**
  - Base de datos Supabase creada y migrada (6 migraciones + seed). Setup completo en `supabase/_bundle_full_setup.sql`; reset en `supabase/_reset_recovery.sql`.
  - Fix de seguridad `supabase/migrations/0006_security_hardening.sql`: el rol de usuario nunca se decide desde el cliente (cerrada una escalada de privilegios). **Verificado**.
  - Corregidos 3 bugs de las migraciones originales (índice/constraint en `0002`, y `seed.sql` reescrito para el esquema final).
  - Corregido el registro: la empresa del cliente se guarda con service-role (antes se perdía con la confirmación de email activa). Ver `src/app/actions/auth.ts`.
  - Security headers en `next.config.ts` (CSP, HSTS, X-Frame-Options, etc.).
  - Local corre con `npm run dev` en Node 22.

## 1. Pre-flight (validar que todo compila)

Ejecutar en la raíz del proyecto, **con Node 22 activo** (`nvm use 22`):

```bash
node -v            # debe ser v22.x
npm ci             # instalar dependencias exactas
npm run test       # 63 tests deben pasar
npm run lint       # sin errores
npx tsc --noEmit   # sin errores de tipos
npm run build      # build de producción debe completar (22 rutas)
```

Si algo falla acá, **no continúes al deploy** — reportá el error al usuario.

## 2. Subir el código a un repo de GitHub del usuario

El proyecto local tiene git, pero el `origin` apunta al repo original de otra persona. Hay que publicarlo en un repo **del usuario**.

1. Verificar que `.env.local` esté ignorado (debe estarlo; `.gitignore` incluye `.env*`). **Nunca** commitear `.env.local` ni las keys.
2. Pedir al usuario que cree un repo vacío en su cuenta de GitHub (ej. `pjm-comercio-exterior`), o crear uno con `gh repo create` si el usuario tiene `gh` autenticado.
3. Apuntar el remoto y pushear:

```bash
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/<USUARIO>/<REPO>.git
git add -A
git commit -m "Deploy prep: security hardening, fixes de migración, registro y headers"
git branch -M main
git push -u origin main
```

> Confirmá con el usuario antes de commitear/pushear (es una acción hacia afuera).

## 3. Decisión: ¿qué proyecto Supabase usa producción?

Preguntar al usuario cuál camino prefiere:

- **A) Reusar el proyecto Supabase actual** (`ref: evqmabxfgplvifvlkcld`, región West US). Más rápido; ya tiene el esquema y datos. **Requiere limpiar los usuarios demo** (ver paso 6.3), porque tienen contraseña pública.
- **B) Crear un proyecto Supabase nuevo para producción** (recomendado para separar prod de pruebas). En ese caso, en el nuevo proyecto: SQL Editor → pegar y ejecutar `supabase/_bundle_full_setup.sql` (crea todo el esquema + seed). No correr el seed de usuarios demo en prod.

Cualquiera sea el elegido, anotá su **Project URL**, **publishable key** y **secret key** (Project Settings → API Keys / Data API) para el paso 5.

## 4. Crear el proyecto en Vercel

1. Pedir al usuario que entre a [vercel.com](https://vercel.com) e importe el repo de GitHub del paso 2 (**Add New → Project → Import**).
2. Framework preset: **Next.js** (se detecta solo). Root directory: raíz del repo. Build command / output: por defecto (Next.js).
3. **Node.js Version: 22.x** (Project Settings → General → Node.js Version). El `engines.node` del `package.json` ya lo fuerza, pero verificar igual.
4. **No hacer deploy todavía** hasta cargar las variables de entorno (paso 5).

## 5. Variables de entorno en Vercel

En **Project Settings → Environment Variables**, agregar las 4 (para los entornos Production y Preview). Los valores salen del proyecto Supabase elegido en el paso 3 (o del `.env.local` local si se reusa el mismo proyecto):

| Variable | Valor | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | **sin** `/rest/v1` ni ninguna ruta al final |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key (`sb_publishable_...`) | pública, va al navegador |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key (`sb_secret_...`) | **secreta**, solo server-side |
| `CRON_SECRET` | string aleatorio largo | Vercel Cron manda `Authorization: Bearer <CRON_SECRET>`; los `/api/cron/*` lo validan (`src/lib/cron.ts`) |

> No pongas las keys en este archivo ni en el repo. Cargalas en el panel de Vercel.

## 6. Configurar Supabase para producción (¡CRÍTICO!)

En el dashboard del proyecto Supabase que usará prod:

### 6.1. URL Configuration (esto rompe el login/confirmación si falta)
**Authentication → URL Configuration:**
- **Site URL:** la URL de producción de Vercel (ej. `https://<proyecto>.vercel.app` o el dominio propio).
- **Redirect URLs:** agregar `https://<proyecto>.vercel.app/**` (y el dominio propio si hay). Sin esto, los links de confirmación de email y los redirects apuntan a `localhost` y fallan.

### 6.2. Email / confirmación
- **Authentication → Sign In / Providers → Email:** decidir con el usuario si "Confirm email" queda **ON** (recomendado en prod).
- Si queda ON, configurar un **SMTP propio** (Resend / SendGrid) en **Authentication → Emails → SMTP Settings**. El SMTP por defecto de Supabase tiene límites bajos y no sirve para volumen real.

### 6.3. Usuarios demo fuera de producción
- **NO** correr `npm run seed:demo-users` contra prod.
- Si se reusa el proyecto actual (camino A del paso 3), borrar los usuarios demo en **Authentication → Users**: `cliente.demo@pjm.local` y `admin.demo@pjm.local`.

## 7. Deploy y verificación

1. Lanzar el deploy en Vercel (**Deploy**). Esperar el build.
2. Si el build falla por Node: confirmar que la versión sea 22.x (paso 4.3).
3. Verificar en la URL de producción:
   - `/` , `/login`, `/registro`, `/simular` → cargan (200).
   - `/dashboard` sin sesión → redirige a `/login`.
   - Registrar un usuario real → confirmar email (si está ON) → login → crear una simulación → generar PDF.
   - Revisar los headers de seguridad en la respuesta (deben venir `Content-Security-Policy`, `Strict-Transport-Security`, etc.).

## 8. Crear el admin real (de forma segura)

El rol no se puede setear desde el cliente (por diseño; ver `0006`). Crear el admin así:
1. El usuario se registra normalmente por `/registro` en producción.
2. En Supabase → **SQL Editor**, promoverlo (corre como superusuario, `auth.uid()` es null, así que el trigger de seguridad lo permite):

```sql
update public.profiles set role = 'admin_pjm' where email = '<email-del-admin>';
```

3. El cambio aplica en el siguiente request (el gate de `/admin` lee `profiles.role`, no el JWT).

## 9. Cron jobs

`vercel.json` ya define dos crons diarios (`/api/cron/expire-formal-quotes` y `/api/cron/expire-documents`, `0 6 * * *`). Se activan solos al deployar **si `CRON_SECRET` está seteado**. En plan Hobby de Vercel los crons son diarios y limitados en cantidad — estos dos entran. Verificar en Vercel → Project → Cron Jobs que aparezcan.

## 10. Checklist final

- [ ] Build de producción OK en Vercel (Node 22).
- [ ] Las 4 env vars cargadas (URL sin ruta, keys correctas, `CRON_SECRET`).
- [ ] Supabase Site URL + Redirect URLs apuntan al dominio de Vercel.
- [ ] Email confirmación decidida (+ SMTP si ON).
- [ ] Usuarios demo eliminados / no seedeados en prod.
- [ ] Registro → login → simulación → PDF funciona en prod.
- [ ] Headers de seguridad presentes.
- [ ] Admin real creado por SQL, no por metadata.
- [ ] Crons visibles en Vercel.

## Troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---|---|---|
| Build falla / crash "native WebSocket not found" | Node < 22 | Node.js Version 22.x en Vercel |
| Link de confirmación va a `localhost` | Site URL sin configurar | Paso 6.1 |
| Login dice "cuenta no confirmada" | Email no confirmado / sin SMTP | Confirmar email o configurar SMTP (6.2) |
| `/api/cron/*` responde 401 | `CRON_SECRET` no seteado en Vercel | Paso 5 |
| Datos no cargan en el navegador (errores CSP en consola) | La CSP no permite un host nuevo | Ajustar `connect-src` en `next.config.ts` |
| Cliente puede/quiere cambiar su rol | (no debería) | Está bloqueado por `0006`; no relajar esa regla |
