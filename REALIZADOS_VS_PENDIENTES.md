# PJM Cotizador — REALIZADOS vs PENDIENTES

> **Qué es esto:** cruce entre la especificación completa (master prompts `v2` —que es superconjunto del `COMPLETO`—, `PJM PROMPT MAESTRO 1` y `PJM PROMPT CORRECCIONES y AJUSTES`) y lo **realmente implementado** en el repo (verificado sobre migraciones `0001–0006`, motor de cálculo, componentes y deploy).
> **Fecha:** 10 de julio de 2026 · **Estado:** en producción (https://pjm-comercio-exterior.vercel.app)

---

## 1. Resumen ejecutivo

**El producto núcleo está construido y funcionando.** Todo el flujo de valor —registro/login, wizard de simulación con motor de cálculo de nacionalización, catálogo NCM versionado, documentos, checklist, cotización formal numerada, panel PJM, PDF y deploy— está **REALIZADO**.

**La mayoría de lo PENDIENTE no son features rotas, sino la "vara de producción" que subió el master prompt v2** respecto del MVP original: precisión decimal, cálculo por ítem, integraciones reales (email/WhatsApp/webhooks), cumplimiento legal (Ley 25.326), performance/paginación, concurrencia, roles granulares y módulos avanzados (escenarios courier, MULC). Son mejoras de robustez y alcance, no bloqueantes del funcionamiento actual.

| Categoría | Estado global |
|---|---|
| Stack, auth, modelo de datos base | ✅ Realizado |
| Motor de cálculo (fórmulas AR) | ✅ Realizado (⚠️ precisión float + cálculo agregado) |
| Wizard + simulador público + dashboard | ✅ Realizado |
| Catálogo NCM / tributos / intervenciones (mecánica) | ✅ Realizado (⚠️ datos semilla, falta feed real) |
| Documentos + checklist + auditoría + notif. in-app | ✅ Realizado |
| Cotización formal (numeración, snapshot, flujo) | ✅ Realizado (⚠️ sin doble aprobación, formato de nº difiere) |
| Panel admin PJM | ✅ Realizado (⚠️ sin SLA/asignación con vencimiento) |
| Integraciones externas reales | 🟡 Solo estructura + fallback (sin proveedores) |
| Legal / privacidad / consentimientos versionados | 🔴 Pendiente |
| Performance (paginación/índices) y concurrencia | 🔴 Pendiente |
| Módulos avanzados (courier/escenarios, MULC) | 🔴 Pendiente |
| CI/CD, ambientes staging, tests de server actions | 🔴 Pendiente |

Leyenda: ✅ realizado · 🟡 parcial · 🔴 pendiente.

---

## 2. REALIZADOS

### Stack y arquitectura
- ✅ Next.js 16 (App Router), React 19, Tailwind 4, TypeScript estricto.
- ✅ Supabase Auth + Postgres con RLS + Storage.
- ✅ Deploy en Vercel, Node 22, middleware en `src/proxy.ts`.
- ✅ Cálculos desacoplados de la UI (motor puro `src/lib/calculations/`).
- ✅ Service role no expuesto al frontend; claves fuera del repo (`.env*` en `.gitignore`).
- ✅ Estructura de integraciones con adapters + patrón de fallback a consola.

### Autenticación y roles
- ✅ Registro + login de clientes.
- ✅ Roles `cliente` y `admin_pjm`, RLS en todas las tablas.
- ✅ Trigger de creación de perfil; **hardening anti escalada de privilegios** (`0006`).
- ✅ Cliente ve solo lo suyo; no valida NCM, no edita tributos, no ve comentarios internos.
- ✅ **Consentimientos capturados en el registro** (términos, aviso estimativo, contacto comercial).

### Modelo de datos (27 tablas, migraciones 0001–0006)
- ✅ profiles, companies, simulations, simulation_items, logistic_costs.
- ✅ ncm_positions, tax_parameters, intervention_rules (+ sus `*_versions`), import_jobs, ncm_validations.
- ✅ documents, simulation_checklist_items, comments, audit_logs, notifications.
- ✅ formal_quotes, formal_quote_items, formal_quote_costs, quote_sequences.
- ✅ feature_flags, exchange_rates, regulatory_references, integration_logs.

### Motor de cálculo (puro, 63 tests)
- ✅ CBM, peso volumétrico/tasable por modo (marítimo FCL/LCL, aéreo, terrestre).
- ✅ Flete por modo, seguro (mínimo 50 USD), responsabilidad por Incoterm (EXW/FOB/CFR/CIF/DAP/DDP).
- ✅ CIF, DIE, tasa estadística, base IVA, IVA, IVA adicional, percepción Ganancias, percepción IIBB.
- ✅ Créditos fiscales, costo definitivo, caja necesaria, costo unitario, ratios (logística/FOB, tributos/CIF).
- ✅ Toma tributos desde `tax_parameters` activos por NCM.

### Wizard, simulación y NCM
- ✅ Wizard completo: operación → mercadería → NCM → logística → preview de tributos → **intervenciones** → checklist.
- ✅ Simulador público `/simular` (calcula sin login).
- ✅ Simulaciones guardadas + dashboard cliente + detalle.
- ✅ Buscador NCM real (código/descripción, normalización de puntos) con autocompletado de tributos.
- ✅ Badge de fuente/vigencia/pendiente de validación PJM; carga manual si no se encuentra la posición.
- ✅ Catálogo NCM versionado + parámetros tributarios + reglas de intervención (severidad info/warning/blocking).
- ✅ Importadores CSV; validaciones NCM (cliente propone / PJM valida); prioridad NCM exacto > capítulo.
- ✅ Solicitar cotización formal (crea `pjm_request`, cambia estado).

### Documentos, checklist y panel
- ✅ Subida a bucket privado `simulation-documents`; tipos, estados y ciclo de vida (uploaded→pending→approved/observed/rejected/replaced/expired).
- ✅ Visibilidad client_visible/internal_only; reemplazo versionado de documento observado.
- ✅ Checklist operativo con semáforo y flags required/blocking.
- ✅ Comentarios internos y visibles al cliente; auditoría; notificaciones in-app (campanita).
- ✅ Panel `/admin`: empresas, usuarios, NCM (posiciones/tributos/intervenciones), solicitudes/[id], integraciones, health center, **KPIs y filtros de solicitudes**, badges de prioridad y controles de estado.

### Cotización formal
- ✅ Numeración correlativa atómica por año (`quote_sequences`), snapshot congelado.
- ✅ Flujo borrador → aprobado → emitido; ítems y costos snapshot; respuesta cliente aceptar/rechazar.
- ✅ Condiciones comerciales embebidas (validez, términos de pago, exclusiones, notas).
- ✅ TC congelado en la cotización → una cotización emitida no se recalcula por cambios posteriores.

### PDF, crons, seguridad y entrega
- ✅ PDF preliminar de simulación y PDF de cotización.
- ✅ Cron `expire-documents` y `expire-formal-quotes` (Vercel Cron) protegidos con `CRON_SECRET`.
- ✅ Security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).
- ✅ Documentación de proceso: README, QA_CHECKLIST, SPRINT_2–5_QA, DEPLOY, IMPLEMENTACION, RELEASE_CANDIDATE_v0.1, PULL_REQUEST_DESCRIPTION.

---

## 3. PENDIENTES (priorizados)

### 🔴 Tier 1 — Correctitud y núcleo de la spec
1. **Precisión monetaria con `decimal.js`.** Confirmado: el motor usa `number` (float) de JS; la spec v2 exige explícitamente no usar float nativo, redondear solo en presentación y registrar moneda/fuente/fecha/regla de redondeo. → Riesgo de centavos en montos grandes.
2. **Cálculo por ítem.** Hoy es **agregado**: un único set de `taxRates` para toda la simulación. La spec exige desglose por ítem (FOB → flete/seguro prorrateado → CIF → tributos por ítem con su propio NCM/alícuota) y luego sumar. Impacta simulaciones multi-producto con NCM distintos.
3. **Feed real de catálogo NCM / tributos.** Hoy hay 7 posiciones semilla ilustrativas. **Ya tenés el insumo:** la tabla `Tabla maestra posición arancelaria + derechos + tasa estadística + IVA` (~1.309 posiciones) mapea a `ncm_positions` + `tax_parameters` y se puede cargar con el importador CSV existente (requiere mapear columnas: Derechos→import_duty, Tasa Estadística→statistical_rate, IVA→iva, Impuestos Internos→other_tax; Anti-Dumping y percepciones no vienen en el CSV).

### 🔴 Tier 2 — Producción y cumplimiento
4. **Confirmación de email + SMTP propio** (Resend/SendGrid) en producción (hoy *Confirm email* OFF → registro con emails falsos).
5. **Legal / Ley 25.326:** tablas `legal_documents` + `user_consents` versionadas, re-aceptación al cambiar versión crítica, política de privacidad, retención/anonimización/exportación de datos personales.
6. **Integraciones externas reales:** proveedor de email, WhatsApp Business API (con opt-in), webhooks salientes (HMAC + reintentos). Hoy solo existen los flags + fallback a log.
7. **Performance:** paginación server-side, índices mínimos en tablas operativas, prohibición de `select *` sin límite / no cargar todo en el frontend.
8. **Concurrencia:** optimistic locking (`updated_at`/`updated_by`) con alerta de recargar; transiciones de estado transaccionales; evitar sobrescritura simultánea de validación NCM / emisión de cotización.
9. **Asignación + SLA:** `assigned_to` existe, pero falta `sla_due_at`/`escalation_status`, pausa de SLA en `waiting_client`, destacado de *overdue* y alerta si no se asigna en X horas.
10. **Exportaciones:** simulaciones/cotizaciones a CSV/XLSX (cliente y PJM), con permisos por rol, auditoría y sin filtrar comentarios internos.
11. **CI/CD + ambientes:** GitHub Actions (lint/build/test bloqueante en push/PR), ambientes local/development/staging/production, migraciones probadas primero en staging.
12. **Tests de Server Actions** (autorización + mutaciones), más allá de los 63 tests del motor puro.

### 🔴 Tier 3 — Alcance avanzado / mejoras
13. **Optimizador de escenarios** courier/aéreo/marítimo (elegibilidad courier parametrizada, comparativa de ahorro/sobrecosto, tablas de tarifas).
14. **Módulo cambiario / MULC** en simulación (pago al exterior requerido, nota de riesgo cambiario, override de TC con comentario obligatorio auditado).
15. **Roles granulares:** Ejecutivo PJM y Especialista aduanero/despachante separados del `admin_pjm`, con matriz de permisos.
16. **Doble aprobación / workflow multi-aprobador** de la cotización formal.
17. **CSP con nonces** (hoy con `unsafe-inline`).
18. **Crons adicionales:** `notify_quotes_expiring`, `health_check`, `cleanup_failed_uploads`, `sync_exchange_rates_daily`.
19. **VUCE:** marca "posición contrastada con VUCE" (fecha/usuario/observación) e importador XLSX/JSON (además de CSV).
20. **Identidad visual estricta** (paleta celeste/blanco/negro, semáforos en gamas de celeste en vez de verde/amarillo/rojo) — requiere revisión visual.

---

## 4. Discrepancias puntuales a decidir
- **Formato de número de cotización:** implementado `COT-AAAA-NNNN`; la spec sugería `PJM-IMP-YYYY-000001`. Confirmar si se deja como está o se alinea.
- **Enfoque "MVP" → "plataforma por fases con criterio de producción":** el archivo de correcciones pide cambiar el encuadre; a nivel código el sistema ya es más que un MVP descartable, pero varios criterios transversales (Tier 2/3) quedan por cumplir.

---

## 5. Recomendación de orden
1. Cargar el **catálogo NCM real** (insumo ya disponible) → valor inmediato y visible.
2. **`decimal.js` + cálculo por ítem** → correctitud de los montos (núcleo del negocio).
3. **Confirmación email + SMTP** y **paginación/índices** → higiene mínima de producción.
4. **Legal (25.326)** y **concurrencia** antes de escalar usuarios reales.
5. El resto (integraciones reales, escenarios courier, roles, doble aprobación) según prioridad comercial de PJM.

> Nota: este documento es un diagnóstico de alcance; no modifica features. Las líneas 🔴 son trabajo futuro sugerido, no defectos del sistema actual, que está operativo en producción.
