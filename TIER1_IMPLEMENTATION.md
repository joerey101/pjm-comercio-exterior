# Guía de implementación — Tier 1 (correctitud del motor de cálculo)

> **Para el agente que ejecute esto (Antigravity o similar):** este documento es autocontenido. No necesitás el historial de la conversación que lo generó. Seguí el orden propuesto; cada sección tiene contexto, archivos exactos a tocar y criterio de aceptación. Si algo no está claro o implica una decisión de negocio (no técnica), detené el turno y preguntá al usuario — no lo resuelvas por tu cuenta.
>
> **Alcance:** SOLO los 3 puntos del "Tier 1" del diagnóstico `REALIZADOS_VS_PENDIENTES.md`. No toques integraciones externas, legal/consentimientos, roles, ni ningún otro ítem de Tier 2/3 — quedan fuera de esta tarea.
>
> **Regla de oro:** el motor de cálculo (`src/lib/calculations/importCostCalculator.ts`) tiene 63 tests y es el corazón del sistema. Cualquier cambio ahí debe mantener los tests existentes en verde (ajustando solo lo que el propio cambio requiera) y agregar tests nuevos para el comportamiento nuevo.

---

## 0. Contexto del proyecto

- **App:** PJM Cotizador Inteligente de Importación Argentina. Simula el costo nacionalizado de una importación (FOB → CIF → tributos → créditos fiscales → caja necesaria).
- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Supabase (Postgres/RLS/Storage). Node 22 requerido. Desplegado en Vercel.
- **Estado:** en producción, funcionando end-to-end (registro → wizard → simulación → PDF → cotización formal). Este trabajo es de **robustez**, no de arreglar algo roto.
- **Motor de cálculo:** `src/lib/calculations/importCostCalculator.ts` (409 líneas, puro, sin I/O, testeado con `src/lib/calculations/importCostCalculator.test.ts` vía `vitest`).
- **Antes de empezar y después de cada paso:**
  ```bash
  nvm use 22   # o verificar node -v == v22.x
  npm run test       # 63 tests deben pasar (más los que agregues)
  npm run lint
  npx tsc --noEmit
  npm run build
  ```

---

## 1. Precisión monetaria con `decimal.js`

### Por qué
El motor usa `number` (float de JS) para todos los montos: FOB, flete, seguro, CIF, tributos, créditos fiscales, caja necesaria. Con multiplicaciones y sumas encadenadas (CIF × alícuota × alícuota...) los floats acumulan error de redondeo. En operaciones de comercio exterior con montos de miles/cientos de miles de USD, ese error puede traducirse en diferencias de centavos que un cliente o un auditor puede cuestionar.

### Qué hacer
1. Instalar la librería:
   ```bash
   npm install decimal.js
   ```
2. En `src/lib/calculations/importCostCalculator.ts`, migrar los cálculos internos (no necesariamente todos los inputs/outputs de golpe) a `Decimal`:
   - Cada función que hoy hace aritmética con `number` (`calculateCIF`, `calculateCustomsDuty`, `calculateStatisticalRate`, `calculateVATBase`, `calculateVAT`, `calculateVATAdditional`, `calculateGananciasPerception`, `calculateIIBBPerception`, `calculateFiscalCredits`, `calculateDefinitiveCost`, `calculateCashRequired`, `calculateUnitCost`, `calculateInsurance`, `calculateInternationalFreight`) debe operar internamente con `Decimal` y solo convertir a `number` (`.toNumber()`) en el **borde de salida** de `calculateSimulationSummary` (el resultado que consumen la UI/DB/PDF).
   - Redondeo: aplicar `.toDecimalPlaces(2)` (o la cantidad de decimales que corresponda a USD/ARS) **solo al presentar/persistir**, nunca en pasos intermedios de la cadena de cálculo. Ese es el principio: redondear una sola vez, al final.
   - Mantené las firmas públicas de las funciones aceptando `number` como hoy (para no romper todos los call-sites de golpe) pero convirtiendo a `Decimal` adentro. Si preferís exponer `Decimal` en la firma pública, es una decisión válida pero de mayor alcance — evaluá el trade-off y, si dudás, preguntale al usuario.
3. Actualizar `src/lib/calculations/importCostCalculator.test.ts`: los tests existentes deben seguir pasando (los resultados no deberían cambiar salvo por corrección de errores de redondeo de último dígito — si un test falla por una diferencia de centavo, es la señal de que el float efectivamente tenía imprecisión; ajustá el valor esperado con el resultado correcto, no relajes la aserción).
4. Agregar **al menos 2 tests nuevos** que expongan el problema que resolviste: un caso con montos que en float acumulan error visible (por ejemplo, muchas iteraciones de porcentaje sobre un monto con decimales) y confirmar que con `Decimal` el resultado es exacto a los 2 decimales esperados.

### Dónde más puede hacer falta (revisar, no asumir)
- `src/lib/quoteTotals.ts` — si suma/calcula totales de la cotización formal, aplicar el mismo criterio.
- Cualquier lugar que persista montos en Supabase (columnas `numeric(14,2)` en las migraciones — la base ya está en `numeric`, que es exacto; el problema está en el cálculo en JS antes de persistir).

### Criterio de aceptación
- [ ] `decimal.js` en `package.json`.
- [ ] Cálculos internos del motor usan `Decimal`; conversión a `number` solo en el borde de salida.
- [ ] Redondeo a 2 decimales solo en la salida final, no en pasos intermedios.
- [ ] 63 tests originales + los nuevos, todos en verde.
- [ ] `npm run build` sin errores.

---

## 2. Cálculo por ítem (en vez de agregado)

### Por qué
Hoy `calculateSimulationSummary` (línea 350 de `importCostCalculator.ts`) recibe **un solo** `taxRates` (import_duty/statistical_rate/iva/iva_additional/ganancias/iibb) para toda la simulación, y un solo `fobValue`. Eso es correcto si la simulación tiene un único producto/NCM, pero la especificación exige que una simulación con **varios ítems de distinto NCM** (y por lo tanto distinta alícuota) calcule los tributos **por ítem** y después sume, en vez de aplicarle a todo el envío el NCM/alícuota de un solo ítem "representativo".

Mirá el modelo de datos: `simulation_items` (migración `0001_init.sql` línea ~176) ya tiene `quantity`, `unit_value`, `total_value`, `ncm_code` por fila, y `0002_ncm_catalog.sql` le agrega `tax_parameter_id` — es decir, **la base de datos ya está preparada** para esto; lo que falta es que el motor de cálculo y el wizard lo usen.

### Qué hacer

1. **Diseñar el nuevo tipo de entrada** en `importCostCalculator.ts`. Hoy `SimulationCalculationInput` (línea 304) tiene `fobValue: number` y `taxRates: {...}` únicos. Cambiar a algo como:
   ```ts
   export interface SimulationItemInput {
     id: string;              // para trazabilidad
     fobValue: number;        // total_value del ítem (quantity * unit_value)
     taxRates: {
       importDuty: number;
       statisticalRate: number;
       iva: number;
       ivaAdditional: number;
       ganancias: number;
       iibb: number;
     };
   }
   ```
   Y `SimulationCalculationInput.items: SimulationItemInput[]` en vez de `fobValue`/`taxRates` sueltos.

2. **Prorratear flete y seguro por ítem.** El flete/seguro se calcula a nivel de todo el envío (depende de CBM/peso total, no del NCM). Hay que prorratearlo entre los ítems, típicamente por proporción de `fobValue` del ítem sobre el FOB total (es el criterio más común y defendible; si el usuario tiene otro criterio de prorrateo — por peso, por volumen — preguntale antes de asumir).

3. **Recalcular por ítem, después sumar:**
   - Para cada ítem: `cif_item = fob_item + flete_prorrateado_item + seguro_prorrateado_item`.
   - `customsDuty_item`, `statisticalRate_item`, `vatBase_item`, `iva_item`, etc. — todos usando el `taxRates` **propio del ítem**.
   - El resultado agregado (`SimulationCalculationResult`) sigue exponiendo los totales (suma de todos los ítems) para no romper la UI que ya consume `cif`, `customsDuty`, etc. a nivel simulación — pero agregá también el desglose por ítem (`itemBreakdown: Array<{ itemId, cif, customsDuty, ... }>`) para que la UI pueda mostrarlo si se necesita más adelante.
   - Caso especial: **un solo ítem** → el resultado debe ser matemáticamente idéntico al cálculo agregado actual (es el caso que ya cubren los 63 tests existentes — no deberían romperse).

4. **Actualizar los call-sites:**
   - `src/app/actions/simulations.ts` (Server Action que arma el input y persiste el resultado) — tiene que pasar a leer `simulation_items` con su `ncm_code`/`tax_parameter_id` propio y armar el array de ítems, en vez de un único FOB/taxRates.
   - `src/components/simulation/TaxesPreviewStep.tsx` (o el componente equivalente del wizard que muestra el preview de tributos) — revisar si necesita mostrar el desglose por ítem.
   - `src/app/simular/PublicSimulator.tsx` — el simulador público también debería soportar múltiples ítems con distinto NCM si hoy no lo hace (revisar primero cómo arma el input hoy).
   - PDF (`src/app/simulaciones/[id]/pdf/page.tsx` y el de cotización) — si el PDF muestra un desglose de tributos, actualizar para reflejar por ítem si corresponde.

5. **Tests nuevos** en `importCostCalculator.test.ts`:
   - Simulación con 2+ ítems de **distinto NCM/alícuota** → confirmar que el total de tributos es la suma de cada ítem calculado con su propia alícuota (y que NO coincide con "aplicar la alícuota de un solo ítem a todo el FOB", para probar que de verdad se corrigió el bug).
   - Simulación con 1 solo ítem → debe dar exactamente igual que antes (regresión).
   - Prorrateo de flete/seguro: confirmar que la suma de los prorrateos por ítem es igual al flete/seguro total (sin perder ni sobrar centavos — atención acá con la conversión a `Decimal` del punto 1).

### Alcance de este cambio (attention)
Este es el cambio de mayor superficie del Tier 1: toca el motor, al menos una Server Action, y probablemente 1-2 componentes de UI. Si el tiempo/presupuesto es limitado, priorizá:
1. Motor de cálculo + tests (el núcleo correcto).
2. Server Action que persiste la simulación.
3. UI de desglose por ítem (puede quedar para una iteración siguiente si el motor ya calcula bien y el total agregado sigue siendo correcto).

### Criterio de aceptación
- [ ] El motor calcula tributos con la alícuota propia de cada ítem, no una alícuota única para toda la simulación.
- [ ] Flete y seguro prorrateados por ítem (criterio de prorrateo documentado en un comentario corto).
- [ ] Caso de 1 solo ítem da el mismo resultado que el cálculo agregado anterior (regresión).
- [ ] Tests nuevos cubriendo multi-ítem con NCM distintos.
- [ ] Server Action de simulaciones actualizada para pasar ítems reales.
- [ ] 63 tests originales (ajustados si corresponde) + nuevos, todos en verde.

---

## 3. Catálogo NCM real (reemplazar el seed ilustrativo)

### Por qué
Hoy `ncm_positions` y `tax_parameters` solo tienen **7 filas de ejemplo** (`supabase/seed.sql`). El usuario ya tiene una tabla real de referencia: `Tabla maestra posición arancelaria + derechos + tasa estadística + IVA` (~1.309 filas), ubicada en `~/Downloads/Tabla maestra posicion arancelaria + derechos + tasa estadistica + Iva - Hoja 1.csv` (verificar que siga ahí; si no, pedirle al usuario que la vuelva a compartir).

### Columnas del CSV del usuario (confirmadas)
```
Posición,Descripción ,Derechos,Tasa Estadísticas,Impuestos Internos,Anti-Dumping,IVA
9620.00.00,estabilizador para celular,16,3,0,0,21%
```

### Columnas que esperan los importadores existentes (NO coinciden 1:1 — hay que mapear)
- `src/lib/ncm/importNcmCatalog.ts` → `parseNcmCatalogCsv()` espera: `code, description, section, chapter, heading, subheading, aec, export_rebate, source, valid_from, valid_to`.
- `src/lib/ncm/importTaxParameters.ts` → `parseTaxParametersCsv()` espera: `ncm_code, import_duty, statistical_rate, iva, iva_additional, ganancias, iibb, other_tax, source, valid_from, valid_to`.

### Qué hacer
1. **Escribir un script de transformación** (un `.mjs`/`.ts` en `scripts/`, ejecutable con `node`, no una migración) que lea el CSV del usuario y genere **dos** CSVs intermedios en el formato que ya esperan los importadores existentes — **no reescribas los parsers**, adaptá los datos de entrada a la interfaz que ya existe:

   - **`ncm_catalog_import.csv`** con columnas `code,description,section,chapter,heading,subheading,aec,export_rebate,source,valid_from,valid_to`:
     - `code` = columna `Posición` del CSV original.
     - `description` = columna `Descripción ` (ojo: tiene un espacio al final en el header — verificarlo al parsear).
     - `section/chapter/heading/subheading`: derivar de los primeros dígitos del código NCM si es posible (capítulo = primeros 2 dígitos), o dejar vacío si no hay dato confiable — no inventes clasificación NCM.
     - `aec`: no viene en el CSV del usuario. Dejar vacío/null, no asumir que es igual a "Derechos".
     - `source`: usar un valor fijo como `'tabla_maestra_2026'` o el nombre que decida el usuario, para poder auditar el origen del dato.
     - `valid_from`: fecha de la importación (hoy). `valid_to`: vacío (vigente).

   - **`tax_parameters_import.csv`** con columnas `ncm_code,import_duty,statistical_rate,iva,iva_additional,ganancias,iibb,other_tax,source,valid_from,valid_to`:
     - `ncm_code` = `Posición`.
     - `import_duty` = `Derechos`.
     - `statistical_rate` = `Tasa Estadísticas`.
     - `iva` = `IVA` (**ojo:** viene como texto con `%`, ej. `"21%"` — hay que parsearlo a número `21`, no `0.21`, para que sea consistente con cómo el motor de cálculo espera los porcentajes, ej. `16` para 16% — confirmar contra `importCostCalculator.ts` líneas 222-254, que dividen por 100 internamente).
     - `other_tax` = `Impuestos Internos`.
     - `iva_additional`, `ganancias`, `iibb`: **no vienen en el CSV del usuario.** No inventar valores — dejar en `0` (que es el default de la tabla) y dejarlo explícito en el reporte del script como "columnas sin dato en la fuente, cargadas en 0". Si el usuario tiene esos datos en otro lado, preguntarle antes de asumir 0 para todo el catálogo.
     - **`Anti-Dumping`** de la fuente **no tiene columna destino** en `tax_parameters` actual. Decisión pendiente del usuario: (a) ignorarlo si no aplica a estos productos, (b) sumarlo a `other_tax`, o (c) agregar una columna nueva `anti_dumping` a la tabla `tax_parameters` (requeriría una migración `0007`, fuera del alcance "solo Tier 1" salvo que el usuario lo pida explícitamente). **Preguntale al usuario cuál prefiere antes de decidir.**

2. **Validar duplicados y códigos incompletos** antes de importar: el importador (`parseNcmCatalogCsv`) ya rechaza códigos duplicados dentro del mismo archivo (se queda con el primero, error en el resto) — revisar el reporte de errores que devuelve y decidir con el usuario qué hacer con los duplicados reales de la fuente (¿son variantes por año/vigencia, o error de la planilla?).

3. **Importar usando el flujo ya existente**, no escribir un importador nuevo desde cero:
   - Vía UI: `src/components/admin/NcmImportPanel.tsx` en el panel `/admin/ncm` (si soporta carga de archivo) — logueado como `admin_pjm`, subir primero `ncm_catalog_import.csv`, después `tax_parameters_import.csv`.
   - Si el importador solo funciona vía Server Action y no hay UI de archivo lista para volumen alto, revisar `src/app/actions/ncm.ts` para invocar el import de forma programática (un script de una sola vez), pero siempre reusando `parseNcmCatalogCsv`/`parseTaxParametersCsv`, no reescribiendo el parseo.
   - Esto crea una nueva fila en `ncm_catalog_versions` / `tax_parameter_versions` (el esquema ya soporta versionado — no hace falta migración nueva para esto). Marcar la versión nueva como `active` y, si corresponde, la semilla vieja (`00000000-0000-0000-0000-000000000001`/`...002`) como `archived` para que no se mezclen en las búsquedas — confirmar con el usuario si quiere conservar la semilla vieja o archivarla.

4. **Verificar en la app** tras la importación:
   - El buscador NCM del wizard (`NcmSearchBox`) encuentra códigos de la tabla real.
   - Al seleccionar un NCM real en una simulación nueva, se autocompletan los tributos correctos.
   - `npm run test` sigue en verde (los tests de `searchNcm`/`matchTaxParameters` no dependen de datos hardcodeados de producción, pero confirmar igual).

### Criterio de aceptación
- [ ] Script de transformación en `scripts/` (documentado con un comentario de cabecera: qué hace, cómo correrlo).
- [ ] Ambos CSV intermedios generados y revisados (columnas sin dato en la fuente claramente marcadas, no rellenadas con supuestos).
- [ ] Decisión tomada con el usuario sobre `anti_dumping` (ignorar / sumar a other_tax / columna nueva).
- [ ] Catálogo importado vía el flujo/import existente (no un parser nuevo).
- [ ] Verificado en la app: buscar y seleccionar un NCM real autocompleta tributos correctos.
- [ ] `npm run test` sigue en verde.

---

## 4. Verificación final (repetir antes de dar por cerrado el Tier 1)

```bash
nvm use 22
npm run test       # todos los tests (originales + nuevos) en verde
npm run lint
npx tsc --noEmit
npm run build
git status --short  # working tree limpio antes de commitear
```

Commitear con mensajes separados por tema (uno para decimal.js, uno para cálculo por ítem, uno para el catálogo NCM) en vez de un solo commit gigante — facilita la revisión humana.

## 5. Qué NO hacer en esta tarea
- No tocar integraciones externas (email/WhatsApp/webhooks), legal/consentimientos, roles granulares, paginación, concurrencia, ni ningún otro ítem de Tier 2/3 de `REALIZADOS_VS_PENDIENTES.md`.
- No renombrar el formato de numeración de cotización (`COT-AAAA-NNNN`) — es una discusión aparte, no de este Tier.
- No agregar features nuevas no pedidas acá.
