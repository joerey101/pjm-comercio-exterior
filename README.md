# PJM Cotizador Inteligente de Importación Argentina

MVP de la plataforma de PJM Comercio Exterior para simular el costo nacionalizado
de una importación en Argentina: FOB, flete, seguro, CIF, tributos, gastos
locales, créditos fiscales, costo unitario y caja necesaria para liberar la
mercadería — con registro de clientes, guardado de simulaciones, PDF
preliminar, solicitud de cotización formal y un panel interno básico para PJM.

Este proyecto parte de la lógica de cálculo del prototipo HTML original
("Cotizador de Carga Internacional") — modalidad marítimo FCL/LCL, aéreo y
terrestre, CBM/peso tasable, seguro, Incoterms — modularizada en
`src/lib/calculations/importCostCalculator.ts` y extendida con las fórmulas
de nacionalización de Argentina (DIE, tasa estadística, IVA, IVA adicional,
percepciones, créditos fiscales y caja necesaria).

## Stack

- **Next.js 16** (App Router, TypeScript) — nota: en Next.js 16 `middleware.ts`
  pasó a llamarse `proxy.ts` (mismo comportamiento, ver `src/proxy.ts`).
- **Tailwind CSS 4**
- **Supabase** — Auth, Postgres (con Row Level Security) y Storage (bucket
  `simulation-documents` ya creado para la fase de carga de documentos).
- Despliegue pensado para **Vercel**.

## Cómo instalar y correr localmente

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto de Supabase

1. Entrá a [supabase.com](https://supabase.com/dashboard) → **New project**.
2. Elegí nombre, contraseña de base de datos y región (cualquiera; Argentina
   no tiene región propia, `South America (São Paulo)` es la más cercana).
3. Esperá a que termine de aprovisionarse (1-2 minutos).
4. En **Project Settings → API** vas a encontrar los tres valores que
   necesita el paso 4: `Project URL`, `anon public key` y
   `service_role key` (este último es secreto, nunca lo expongas en el
   cliente ni lo commitees).

### 3. Aplicar la migración y el seed

**Opción A — Supabase CLI (recomendado):**

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>   # está en la URL del dashboard
npx supabase db push                                # aplica supabase/migrations/0001_init.sql
```

El seed (`supabase/seed.sql`) no corre automáticamente con `db push`. Aplicalo
con:

```bash
npx supabase db execute -f supabase/seed.sql --linked
```

**Opción B — SQL Editor del dashboard (sin CLI):**

1. Abrí **SQL Editor → New query**.
2. Pegá y ejecutá todo el contenido de `supabase/migrations/0001_init.sql`.
3. En una segunda query, pegá y ejecutá `supabase/seed.sql`.

Verificá que haya funcionado: **Table Editor** debería mostrar 10 tablas
(`profiles`, `companies`, `simulations`, `simulation_items`, `ncm_positions`,
`tax_parameters`, `logistic_costs`, `documents`, `pjm_requests`, `comments`)
y `ncm_positions`/`tax_parameters` deberían tener 7 filas cada una.

### 4. Configurar `.env.local`

```bash
cp .env.example .env.local
```

Completá los tres valores del paso 2:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<tu-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

`.env.local` está en `.gitignore` — nunca se commitea. `SUPABASE_SERVICE_ROLE_KEY`
sólo la usan scripts locales (`scripts/seed-demo-users.mjs`) y nunca se envía
al navegador.

### 5. Correr localmente

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). `npm run build` y
`npm run lint` no requieren credenciales de Supabase (todas las rutas son
100% dinámicas); las credenciales sólo hacen falta en tiempo de ejecución
(`npm run dev` / `npm run start` / el deploy en Vercel).

Para desarrollo, se recomienda desactivar la confirmación de email en
**Authentication → Sign In / Providers → Email** (`Confirm email` = off), así
el registro deja al usuario logueado inmediatamente. En producción dejalo
activado.

### 6. Crear usuarios de ejemplo (opcional)

Con las credenciales del paso 4 completas, corré:

```bash
npm run seed:demo-users
```

Esto crea (vía la Admin API de Supabase, la forma soportada — nunca
insertando directo en `auth.users` por SQL) dos cuentas de prueba:

| Rol         | Email                     | Password       |
| ----------- | ------------------------- | -------------- |
| `cliente`   | `cliente.demo@pjm.local`  | `PjmDemo2026!` |
| `admin_pjm` | `admin.demo@pjm.local`    | `PjmDemo2026!` |

Es idempotente (podés correrlo de nuevo sin duplicar usuarios) y **no se
debe correr contra un proyecto de producción** — crea credenciales de login
reales con una contraseña pública. Si preferís no correr el script, creá los
usuarios a mano desde **Authentication → Users → Add user** en el dashboard
y seguí con el paso 7 para el admin.

### 7. Crear (o promover) un usuario `admin_pjm` a mano

Si no usaste el script del paso 6, cualquier usuario registrado por
`/registro` puede promoverse a admin_pjm desde el **SQL Editor**:

```sql
update public.profiles set role = 'admin_pjm' where email = 'tu-email@pjm.com.ar';

-- También actualizá el JWT metadata para que quede consistente
-- (el proxy ya lee el rol desde `profiles`, así que esto es sólo para
-- que cualquier otro código que mire user_metadata no quede desactualizado):
update auth.users
set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', 'admin_pjm')
where email = 'tu-email@pjm.com.ar';
```

No hace falta cerrar sesión: el gate de `/admin` (`src/proxy.ts` →
`src/lib/supabase/middleware.ts`) consulta `profiles.role` en cada request,
no el JWT, así que el cambio aplica en el siguiente request.

### 8. Configurar las redirect URLs de Supabase Auth

En **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` en desarrollo; la URL de producción
  de Vercel (ver más abajo) una vez desplegado.
- **Redirect URLs**: agregá tanto `http://localhost:3000/**` como
  `https://<tu-dominio-de-vercel>.vercel.app/**` (y tu dominio propio si
  usás uno). Sin esto, los links de confirmación de email y de recuperación
  de contraseña van a fallar o redirigir a un dominio incorrecto.

Este proyecto no usa OAuth de terceros ni magic links todavía, así que no
hace falta configurar providers adicionales.

## Estructura de carpetas

```
src/
  app/                        Rutas (App Router)
    page.tsx                  Landing pública
    simular/                  Calculadora pública (sin login)
    login/, registro/         Auth
    perfil/                   Perfil de cliente y empresa
    dashboard/                Dashboard cliente (historial de simulaciones)
    simulaciones/nueva/       Wizard de nueva simulación
    simulaciones/[id]/        Resultado / detalle de simulación
    simulaciones/[id]/pdf/    PDF preliminar (imprimible)
    admin/                    Panel interno PJM (solicitudes, usuarios, empresas)
    actions/                  Server Actions (auth, company, simulations, admin)
  components/
    layout/                   Header, Footer
    ui/                       Primitivas (Card, Button, Field, Badge)
    simulation/                Pasos del wizard + tarjetas de resultado
    admin/                    Controles del panel PJM
  lib/
    calculations/              Motor de cálculo (puro, sin UI)
    supabase/                  Clientes de Supabase (browser/server) + sesión de proxy
    constants/                 Ubicaciones, tarifas de referencia, catálogo NCM de ejemplo, estilos de estado
    validations/                Esquemas Zod
    dal.ts                     Data Access Layer (verificación de sesión/rol)
    errorMessages.ts           Traducción de errores de Supabase a mensajes cortos en español
  types/                      Tipos de dominio y de la base de datos
  proxy.ts                    Protección de rutas + refresco de sesión (ex-middleware.ts)
supabase/
  migrations/0001_init.sql    Esquema completo + RLS + índices
  seed.sql                    Catálogo NCM y parámetros de impuestos de ejemplo
scripts/
  seed-demo-users.mjs         Crea usuarios cliente/admin_pjm de prueba vía Admin API
QA_CHECKLIST.md               Checklist de pruebas manuales de punta a punta
```

## Modelo de datos

Tablas Postgres (ver `supabase/migrations/0001_init.sql`):

- `profiles` — extiende `auth.users` (rol `cliente` | `admin_pjm`), se crea
  automáticamente con un trigger al registrarse.
- `companies` — datos de la empresa del cliente.
- `simulations` — una simulación de importación completa, con todos los
  valores calculados (FOB, CIF, tributos, créditos fiscales, caja necesaria,
  costo unitario) y sus estados (`status`, `ncm_status`, `document_status`).
  `raw_data` guarda el borrador completo del wizard (JSON) para poder
  reabrirlo o auditarlo.
- `simulation_items` — ítems de mercadería de una simulación.
- `ncm_positions` / `tax_parameters` — catálogo de referencia NCM y tasas
  (editable por admin a futuro; hoy poblado con datos de ejemplo).
- `logistic_costs` — desglose logístico de la simulación.
- `documents` — metadatos de documentación (checklist documental); el bucket
  de Storage `simulation-documents` ya está creado para la carga real de
  archivos en una fase siguiente.
- `pjm_requests` — solicitud de cotización formal asociada a una simulación.
- `comments` — comentarios internos de PJM sobre una solicitud.

Row Level Security: un cliente sólo ve sus propias filas (`user_id = auth.uid()`
o a través de la simulación asociada); `admin_pjm` ve todo, vía la función
`is_admin_pjm()`. Están indexadas todas las columnas de foreign key /
filtrado frecuente (`user_id`, `simulation_id`, `status`, etc. — ver el
bloque "Indexes" al final de `0001_init.sql`; Postgres no las indexa solas).

`companies.user_id` es `unique`: el modelo del MVP asume una empresa por
cliente (lo que asumen también `/perfil` y el wizard al usar `.maybeSingle()`).

## Cálculos

Todo vive en `src/lib/calculations/importCostCalculator.ts` (funciones puras,
sin I/O), reexportado también en la vista previa en vivo del wizard y en el
simulador público (`/simular`):

```
CIF = FOB + flete internacional + seguro
DIE = CIF * derecho_importacion
Tasa estadística = CIF * tasa_estadistica
Base IVA = CIF + DIE + tasa_estadistica
IVA = Base IVA * alicuota_iva
IVA adicional = Base IVA * iva_adicional
Ganancias = Base IVA * percepcion_ganancias
IIBB = Base IVA * percepcion_iibb
Costo definitivo = flete + seguro + gastos locales + DIE + tasa estadística + despacho + flete interno + otros costos definitivos
Créditos fiscales = IVA + IVA adicional + Ganancias + IIBB
Caja necesaria = costo definitivo + créditos fiscales
Costo unitario = caja necesaria / cantidad de unidades
```

La lógica de flete/CBM/peso tasable por modalidad (marítimo LCL/FCL, aéreo,
terrestre) y de responsabilidad de costos por Incoterm es el mismo motor del
prototipo original, ahora en funciones puras y testeables.

**Los cálculos son siempre estimativos.** La UI lo remarca en la landing, en
cada resultado, en el PDF preliminar y en el disclaimer del footer — nunca se
presenta como cotización vinculante.

## QA manual

Antes de cada release, correr la lista de pruebas manuales de punta a punta
en [`QA_CHECKLIST.md`](./QA_CHECKLIST.md) contra un proyecto Supabase real
(registro, login, wizard completo, solicitud formal, panel admin y, en
particular, control de Row Level Security entre dos clientes distintos).

## Deploy en Vercel

1. Importá el repositorio en [vercel.com/new](https://vercel.com/new). Framework
   preset "Next.js" se detecta solo.
2. En **Settings → Environment Variables** del proyecto de Vercel, cargá las
   mismas tres variables de `.env.local` para los entornos que uses
   (Production / Preview / Development):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marcala para que **no** se exponga al
     bundle del cliente — al no tener el prefijo `NEXT_PUBLIC_`, Next.js ya
     la mantiene server-only, pero revisá igual que ningún código bajo
     `'use client'` la importe).
3. Deploy. Vercel construye con `npm run build` — el mismo comando que
   corrés localmente, y no requiere las variables de Supabase en build time
   (todas las rutas son dinámicas), sólo en runtime.
4. Una vez que tengas la URL de producción (`https://tu-proyecto.vercel.app`
   o tu dominio propio), volvé a **Supabase → Authentication → URL
   Configuration** y agregala a **Site URL** / **Redirect URLs** (ver paso 8
   de la sección de instalación). Si no lo hacés, la confirmación de email
   en producción va a redirigir a `localhost`.
5. Verificación post-deploy: repetir al menos los puntos 1, 2 y 8 del
   `QA_CHECKLIST.md` (registro, login, permisos de admin) contra la URL de
   producción.

Checklist rápido de "no hay nada hardcodeado":

- [ ] `grep -rn "supabase.co\|eyJhbGciOi" src/` no devuelve URLs ni JWTs
      pegados a mano en el código (sólo deberían aparecer vía
      `process.env.*`).
- [ ] `.env.local` y `.env*` (salvo `.env.example`) están en `.gitignore` y
      `git status` no los lista como trackeados.
- [ ] `.env.example` lista las tres variables sin valores reales.
- [ ] `npm run build` termina sin errores con `.env.local` ausente (las
      credenciales sólo hacen falta en runtime, no en build).

## Próximos pasos sugeridos

- Carga real de documentos al bucket `simulation-documents` (invoice, packing
  list, BL/AWB, certificado de origen, etc.) con vista previa y checklist
  conectado a `documents`.
- Reemplazar el catálogo NCM de ejemplo (`src/lib/constants/ncmSamples.ts`,
  tablas `ncm_positions`/`tax_parameters`) por una fuente real (MERCOSUR/AEC,
  ARCA/VUCE), con buscador y versionado por vigencia.
- Motor de intervenciones (ANMAT, SENASA, INAL, etc.) automático en base al
  NCM, hoy es una selección manual con semáforo.
- PDF preliminar con diseño más avanzado (hoy es una vista imprimible desde
  el navegador) y envío por email.
- Asignación de especialista aduanero/despachante como rol separado de
  `admin_pjm`, con permisos more granulares.
- Integraciones futuras (fuera de alcance de este MVP): ARCA, Banco Nación /
  MULC, navieras, pagos, IA clasificadora de NCM.
