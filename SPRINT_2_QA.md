# Sprint 2 QA — NCM real + tributos parametrizados

Pruebas manuales contra un proyecto Supabase con `0001_init.sql` +
`0002_ncm_catalog.sql` + `supabase/seed.sql` aplicados. Ver también
`QA_CHECKLIST.md` (Sprint 1.5) para el flujo base de cuenta/login/dashboard.

Preparación:
- [ ] Migración `0002_ncm_catalog.sql` aplicada sin errores.
- [ ] `npm run test` pasa en local (37 tests unitarios de normalización,
      búsqueda, match de tributos/intervenciones y motor de cálculo).
- [ ] El seed de Sprint 1 quedó envuelto en una versión activa
      ("Catálogo semilla (Sprint 1)" / "Tributos semilla (Sprint 1)") — se
      ve en `/admin/ncm` y `/admin/ncm/tributos`.

## Cliente

- [ ] En el paso 3 (NCM) del wizard, buscar por código con puntos
      (`8471.30.12`) → aparece como primer resultado ("Código exacto").
- [ ] Buscar el mismo código sin puntos (`84713012`) → mismo resultado.
- [ ] Buscar por palabra clave (`notebooks`, `textil`) → aparecen coincidencias
      por descripción.
- [ ] Seleccionar un resultado → se autocompletan descripción, AEC, fuente,
      vigencia y las 6 tasas tributarias (DIE, TE, IVA, IVA adicional,
      Ganancias, IIBB).
- [ ] El badge de estado queda en "Pendiente de validación PJM" (nunca
      "Validado" al elegir desde el buscador).
- [ ] Si el NCM tiene una regla de intervención cargada, se muestra la
      alerta correspondiente (info/warning/blocking) debajo de las tasas.
- [ ] Si no hay parámetros tributarios activos para el código elegido,
      aparece el mensaje "No hay parámetros tributarios activos para esta
      posición..." y las tasas quedan en 0/editables a mano.
- [ ] "No encuentro la posición, cargar código manualmente" → permite tipear
      código y descripción a mano; el estado pasa a "Propuesto por cliente".
- [ ] Guardar la simulación → en Supabase, `simulation_items.ncm_position_id`
      y `tax_parameter_id` quedan completos cuando el NCM vino del buscador,
      y `ncm_source = 'catalog'`; al cargar manual, ambos quedan `null` y
      `ncm_source = 'manual'`.
- [ ] `simulations.has_tax_warning` es `true` si algún ítem no tiene
      parámetros tributarios activos asociados.
- [ ] Ver el resultado de la simulación: los tributos calculados coinciden
      con los parámetros mostrados en el paso 3 (no son los valores
      hardcodeados del Sprint 1).

## Admin

- [ ] `/admin/ncm`: ver el listado de posiciones activas, buscar código en
      la tabla, ver versiones con estado (draft/active/inactive).
- [ ] Importar un CSV de catálogo con 2-3 filas válidas (columnas: code,
      description, section, chapter, heading, subheading, aec,
      export_rebate, source, valid_from, valid_to) → se crea una versión en
      estado "draft" con `row_count` correcto.
- [ ] La versión draft **no** aparece en las búsquedas del cliente hasta
      activarla (columna `is_active` sigue en `false`).
- [ ] "Activar" la nueva versión → pasa a estado "active", sus filas quedan
      `is_active = true` y aparecen en el buscador del wizard.
- [ ] Subir un CSV con un código NCM inválido (menos de 8 dígitos) y un
      código duplicado dentro del archivo → el reporte de errores lista
      ambas filas con el número de fila y el motivo, y esas filas no se
      insertan (pero las válidas sí).
- [ ] `/admin/ncm/tributos`: importar un CSV de tributos con un `ncm_code`
      que todavía no existe en el catálogo → la fila se importa igual, con
      advertencia (no error duro), tal como pide el sprint.
- [ ] `/admin/ncm/intervenciones`: importar reglas por NCM exacto y por
      capítulo; confirmar que una regla por NCM exacto se antepone a una de
      capítulo para el mismo código (ver test unitario
      `matchInterventionRules.test.ts` para el caso equivalente).
- [ ] En `/admin/solicitudes/[id]`, cada ítem de mercadería muestra su
      tarjeta de validación NCM con las tasas/intervenciones aplicadas.
- [ ] "Validar NCM" sin comentario → funciona (comentario es opcional al
      validar).
- [ ] "Rechazar" o "Requiere revisión" sin comentario → bloqueado con el
      mensaje "El comentario técnico es obligatorio...".
- [ ] Validar el NCM de un ítem → `simulation_items.ncm_status` pasa a
      `validado_pjm`, se crea una fila en `ncm_validations` con
      `validated_by` = el admin logueado, y si es el único ítem,
      `simulations.ncm_status` también pasa a `validado_pjm`.

## RLS

- [ ] Un usuario `cliente` autenticado puede leer `ncm_positions`,
      `tax_parameters` e `intervention_rules` (activos) pero un `insert`
      directo contra esas tablas (probado desde el SQL Editor "Run as" con
      el JWT del cliente, o vía REST) es rechazado por RLS.
- [ ] Un `cliente` no puede leer ni escribir en `import_jobs`.
- [ ] Un `cliente` puede leer `ncm_validations` de sus propias simulaciones
      (solo lectura) pero no puede insertar ni actualizar filas ahí.
- [ ] `admin_pjm` puede hacer todo lo anterior sin restricciones.

## Build / lint / tests

- [ ] `npm run build` sin errores.
- [ ] `npm run lint` sin errores.
- [ ] `npm run test` — 37/37 tests unitarios en verde.
