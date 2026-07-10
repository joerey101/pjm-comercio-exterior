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

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear un proyecto en [supabase.com](https://supabase.com) y copiar `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Completar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API en el dashboard de Supabase).
3. Aplicar el esquema de base de datos. Con la [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase link --project-ref <tu-project-ref>
   supabase db push
   ```
   O bien pegar el contenido de `supabase/migrations/0001_init.sql` y luego
   `supabase/seed.sql` en el SQL Editor del dashboard, en ese orden.
4. Levantar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abrir [http://localhost:3000](http://localhost:3000).
5. Para promover un usuario registrado a `admin_pjm` (acceso al Panel PJM en
   `/admin`), ejecutar en el SQL Editor de Supabase:
   ```sql
   update public.profiles set role = 'admin_pjm' where email = 'tu-email@pjm.com.ar';
   ```

`npm run build` y `npm run lint` no requieren credenciales de Supabase (las
rutas son 100% dinámicas); sólo se necesitan en tiempo de ejecución.

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
  types/                      Tipos de dominio y de la base de datos
  proxy.ts                    Protección de rutas + refresco de sesión (ex-middleware.ts)
supabase/
  migrations/0001_init.sql    Esquema completo + RLS
  seed.sql                    Catálogo NCM y parámetros de impuestos de ejemplo
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
`is_admin_pjm()`.

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
