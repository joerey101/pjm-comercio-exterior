# PJM Cotizador Inteligente de Importación — Implementación Completa

> **Fecha de deploy:** 10 de julio de 2026
> **Responsable:** Jose Rey (`joerey@gmail.com`)
> **Estado:** ✅ En producción

---

## 🌐 URLs del proyecto

| Recurso | URL |
|---|---|
| **Sitio en producción** | https://pjm-comercio-exterior.vercel.app |
| **Repositorio GitHub** | https://github.com/joerey101/pjm-comercio-exterior |
| **Dashboard Supabase** | https://supabase.com/dashboard/project/evqmabxfgplvifvlkcld |
| **Dashboard Vercel** | https://vercel.com/dashboard |

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind 4 |
| Base de datos | Supabase (Postgres con RLS) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Deploy | Vercel (plan Hobby) |
| Node.js | v22.x (requisito mínimo) |
| Middleware | `src/proxy.ts` (no `middleware.ts`) |

---

## 📋 Lo implementado

### Base de datos (Supabase)
- **6 migraciones** aplicadas + seed inicial
- `0001` — Esquema base de usuarios y perfiles
- `0002` — Catálogo NCM (corregido: índice y constraint)
- `0003` — Simulaciones y cálculos de importación
- `0004` — Cotizaciones formales numeradas
- `0005` — Documentos y checklist
- `0006` — **Security hardening**: el rol de usuario nunca se decide desde el cliente (cierre de escalada de privilegios)
- Archivos de referencia en el repo:
  - `supabase/_bundle_full_setup.sql` — setup completo desde cero
  - `supabase/_reset_recovery.sql` — reset de emergencia

### Seguridad
- **Security headers** en `next.config.ts`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **RLS (Row Level Security)** activo en todas las tablas de Supabase
- **Rol admin** solo asignable desde el SQL Editor de Supabase (nunca desde el cliente)
- **`.env.local` excluido** del repositorio via `.gitignore`
- **CRON_SECRET** separado para dev y producción

### Fixes aplicados durante desarrollo
- Registro de empresa del cliente: se guarda con service-role (antes se perdía con confirmación de email activa). Ver `src/app/actions/auth.ts`
- `supabase/seed.sql` reescrito para el esquema final
- Corrección de índice/constraint en migración `0002`

### Cron Jobs (automáticos, diarios 6:00 AM UTC)

| Job | Ruta | Función |
|---|---|---|
| Vencimiento de cotizaciones | `/api/cron/expire-formal-quotes` | Marca cotizaciones vencidas |
| Vencimiento de documentos | `/api/cron/expire-documents` | Marca documentos vencidos |

> Activos automáticamente en Vercel al deployar mientras `CRON_SECRET` esté seteado.

---

## ⚙️ Variables de entorno en Vercel

Cargadas en **Project Settings → Environment Variables** (Production + Preview):

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (sin barra ni ruta al final) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (va al navegador) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (solo server-side) |
| `CRON_SECRET` | String aleatorio para autenticar los cron jobs |

> ⚠️ Nunca commitear estas variables. Están en `.gitignore` via `.env*`.

---

## 🔐 Configuración de Supabase para producción

### URL Configuration
- **Site URL:** `https://pjm-comercio-exterior.vercel.app`
- **Redirect URLs:** `https://pjm-comercio-exterior.vercel.app/**`

### Auth
- **Confirm email:** OFF (desactivado)
- **Allow new users to sign up:** ON
- **Usuarios demo eliminados:** `admin.demo@pjm.local` y `cliente.demo@pjm.local` borrados

---

## 👤 Roles del sistema

| Rol | Acceso |
|---|---|
| `cliente` | `/dashboard`, `/simular`, `/simulaciones/*`, `/perfil` |
| `admin_pjm` | Todo lo anterior + `/admin` y todas sus sub-rutas |

### Cómo crear un admin (proceso seguro)
El rol **nunca** se puede autoasignar desde la app. Proceso:
1. El usuario se registra normalmente en `/registro`
2. En Supabase → SQL Editor, correr:

```sql
update public.profiles set role = 'admin_pjm' where email = 'email@ejemplo.com';
```

3. El usuario cierra sesión y vuelve a entrar → acceso a `/admin` activo

### Admin actual en producción

| Nombre | Email | Rol |
|---|---|---|
| Jose Rey | joerey@gmail.com | `admin_pjm` |

---

## 🚀 Proceso de deploy (resumen)

```bash
# 1. Pre-flight (con Node 22 activo)
node -v            # v22.x ✅
npm ci             # ✅
npm run lint       # sin errores ✅
npx tsc --noEmit   # sin errores de tipos ✅
npm run build      # 22 rutas generadas ✅

# 2. Push al repo propio
git remote remove origin
git remote add origin https://github.com/joerey101/pjm-comercio-exterior.git
git add -A
git commit -m "Deploy prep: security hardening, fixes de migración, registro y headers"
git branch -M main
git push -u origin main

# 3. Vercel importó el repo automáticamente
# Framework: Next.js (auto-detectado)
# Node.js Version: 22.x (configurado en Project Settings)
```

---

## ✅ Checklist final verificado

- [x] Build de producción OK en Vercel (Node 22, 22 rutas)
- [x] 4 env vars cargadas correctamente
- [x] Supabase Site URL + Redirect URLs apuntan a Vercel
- [x] Email confirmación desactivada
- [x] Usuarios demo eliminados
- [x] Admin real creado por SQL (`joerey@gmail.com`)
- [x] Panel `/admin` accesible y funcional
- [x] Datos persistidos desde desarrollo local
- [x] Cron jobs activos en Vercel
- [x] Security headers presentes en respuestas HTTP
- [x] Código en repositorio GitHub propio

---

## 🔧 Troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---|---|---|
| Build falla / crash "native WebSocket not found" | Node < 22 | Node.js Version 22.x en Vercel |
| Login redirige a `localhost` | Site URL sin configurar | Authentication → URL Configuration |
| Login dice "cuenta no confirmada" | Confirm email ON sin SMTP | Desactivar confirm email o configurar SMTP |
| `/api/cron/*` responde 401 | `CRON_SECRET` no seteado | Project Settings → Environment Variables |
| Errores CSP en consola del navegador | CSP no permite un host nuevo | Ajustar `connect-src` en `next.config.ts` |
| Usuario no puede acceder a `/admin` | Sesión con JWT viejo | Cerrar sesión y volver a entrar |
| UPDATE de rol devuelve "No rows returned" | Normal sin RETURNING en SQL Editor | Verificar con SELECT — si aparece el rol, funcionó |
