# QA Checklist — Sprint 1.5 (estabilización)

Pruebas manuales de punta a punta contra un proyecto Supabase real (no contra
mocks). Marcá cada casillero a medida que lo verificás. Si algo falla, anotá
el paso exacto y el mensaje de error mostrado.

Preparación:
- [ ] Migración aplicada (`supabase/migrations/0001_init.sql`) y seed de
      referencia cargado (`supabase/seed.sql`).
- [ ] `.env.local` completo con las credenciales del proyecto.
- [ ] `npm run dev` corriendo sin errores en consola.
- [ ] (Opcional) `npm run seed:demo-users` ejecutado para tener cuentas de
      prueba `cliente.demo@pjm.local` / `admin.demo@pjm.local`.

---

## 1. Registro de cliente

- [ ] Ir a `/registro`, completar los 3 pasos (datos personales, empresa,
      consentimientos) con un email nuevo y "Crear cuenta".
- [ ] Si el proyecto de Supabase tiene confirmación de email activada: se
      muestra el mensaje "Cuenta creada. Revisá tu email..." y **no** navega
      solo al dashboard hasta confirmar.
- [ ] Si la confirmación de email está desactivada (recomendado para
      desarrollo, ver README): redirige directo a `/dashboard`.
- [ ] En Supabase Dashboard → Table Editor → `profiles`: existe una fila con
      `role = 'cliente'` y los datos cargados.
- [ ] En `companies`: existe una fila asociada (`user_id`) con los datos de
      la empresa cargada en el paso 2.
- [ ] Reintentar el registro con el **mismo email**: se muestra un mensaje
      claro ("Ya existe una cuenta con ese email...", no un error técnico
      crudo de Postgres/GoTrue).
- [ ] Dejar un campo obligatorio vacío (ej. CUIT): se muestra el error de
      validación debajo del campo, no se envía el formulario.

## 2. Login de cliente

- [ ] Login con el usuario recién creado → redirige a `/dashboard`.
- [ ] Login con contraseña incorrecta → mensaje "Email o contraseña
      incorrectos.", el formulario no navega.
- [ ] Login con email que no existe → mismo mensaje genérico (no revela si
      el email existe o no).
- [ ] Estando logueado, ir manualmente a `/login` o `/registro` → redirige
      automáticamente a `/dashboard`.
- [ ] Cerrar sesión desde el header → vuelve a la landing y `/dashboard`
      redirige a `/login`.

## 3. Perfil de empresa

- [ ] Ir a `/perfil`, los datos cargados en el registro aparecen precargados.
- [ ] Editar razón social / CUIT / domicilio y "Guardar perfil" → mensaje de
      éxito "Perfil actualizado correctamente." y los cambios persisten al
      recargar la página.
- [ ] Verificar en Supabase que `companies.updated_at` cambió.

## 4. Crear simulación (empresa faltante)

- [ ] Crear un usuario nuevo por Supabase Admin API o Dashboard **sin**
      pasar por `/registro` (o borrar su fila de `companies`) y loguearse.
- [ ] Ir a `/simulaciones/nueva` → se muestra la advertencia "Completá el
      perfil de tu empresa" con botón a `/perfil`, en vez del wizard.
- [ ] Completar el perfil y volver a `/simulaciones/nueva` → ahora sí carga
      el wizard.

## 5. Crear y guardar simulación (wizard completo)

- [ ] Paso 1 (Operación): cambiar modalidad de transporte y ver que
      Origen/Destino se recalculan con las ubicaciones correctas.
- [ ] Paso 2 (Mercadería): agregar 2 ítems, confirmar que "Valor total FOB"
      se recalcula solo.
- [ ] Paso 3 (NCM): elegir una posición de referencia → tasas e código NCM
      se completan solos; elegir "manual" → estado pasa a "Propuesto por
      cliente" y quedan tasas editables.
- [ ] Paso 4 (Intervenciones): marcar un organismo y cambiar el semáforo de
      riesgo.
- [ ] Paso 5 (Logística): tocar "Usar valores estimados PJM" y ver que las
      tarifas se completan según la ruta elegida.
- [ ] Paso 6 (Tributos): los números de la vista previa (CIF, créditos
      fiscales, caja necesaria) se actualizan en vivo al volver a pasos
      anteriores y cambiar valores.
- [ ] Paso 7 (Checklist): tildar algunos ítems, ver el semáforo cambiar de
      rojo → amarillo → verde.
- [ ] "Calcular y guardar simulación" → redirige a `/simulaciones/[id]`.
- [ ] En Supabase: existe la fila en `simulations` con `status = 'completed'`,
      fila(s) en `simulation_items`, y una fila en `logistic_costs`.
- [ ] Volver a `/dashboard`: la simulación aparece en la lista (tabla en
      desktop, tarjetas en mobile) con el mismo total y caja necesaria.

## 6. Resultado de simulación

- [ ] Las tarjetas muestran, sin ambigüedad, tres bloques distintos: costo
      económico definitivo, créditos fiscales y caja necesaria (destacada).
- [ ] El disclaimer legal es visible sin scroll adicional en desktop.
- [ ] "Descargar PDF preliminar" abre `/simulaciones/[id]/pdf` con logo,
      datos del cliente/empresa, desglose y disclaimer; "Imprimir / Guardar
      PDF" dispara el diálogo de impresión del navegador.

## 7. Solicitar cotización formal

- [ ] Desde el resultado, "Solicitar cotización formal PJM" → aparece el
      mensaje de confirmación y el botón desaparece (ya no se puede
      re-solicitar desde la UI).
- [ ] `simulations.status` pasa a `sent_to_pjm` y se crea una fila en
      `pjm_requests` con `status = 'sent_to_pjm'`.
- [ ] Volver a intentar (llamando la acción dos veces seguido, o
      recargando rápido y reintentando) no debe romper con un error de RLS:
      el pedido debe ser idempotente.
- [ ] Probar el caso de error: crear una simulación para un usuario sin
      empresa cargada (ver punto 4) y forzar la solicitud → mensaje claro
      pidiendo completar el perfil de empresa primero.

## 8. Login admin y permisos

- [ ] Promover un usuario a `admin_pjm` siguiendo el README (¡no olvidar el
      paso de `auth.users.raw_user_meta_data`, ver nota de RLS abajo!).
- [ ] Login con ese usuario → redirige directo a `/admin` (no a
      `/dashboard`).
- [ ] Un usuario `cliente` que intenta entrar a `/admin` manualmente por URL
      → es redirigido a `/dashboard?error=forbidden` con el banner "No
      tenés permisos de administrador...".
- [ ] Un usuario no logueado que intenta entrar a `/admin` o `/dashboard` →
      redirige a `/login`.

## 9. Ver solicitudes (panel PJM)

- [ ] `/admin` lista todas las solicitudes de todos los clientes (no solo
      las propias).
- [ ] En mobile (< 768px): se ven tarjetas con cliente, empresa, estado y
      caja necesaria — no una tabla con columnas cortadas.
- [ ] `/admin/usuarios` lista todos los `profiles`; `/admin/empresas` lista
      todas las `companies`.

## 10. Cambiar estado / validar NCM / estado documental

- [ ] Entrar al detalle de una solicitud (`/admin/solicitudes/[id]`).
- [ ] Cambiar "Estado de la simulación" → se refleja inmediatamente en la
      página y en `simulations.status` / `pjm_requests.status`.
- [ ] Cambiar "Estado NCM" a "Validado por PJM" → se refleja en
      `simulations.ncm_status` y el cliente lo ve en `/simulaciones/[id]`.
- [ ] Cambiar "Estado documental" → se refleja en `simulations.document_status`
      y el semáforo de riesgo documental del cliente cambia de color.

## 11. Comentarios internos

- [ ] Agregar un comentario interno desde `/admin/solicitudes/[id]` →
      aparece en la lista sin recargar la página.
- [ ] Verificar en Supabase que la fila de `comments` tiene
      `user_id = <id del admin logueado>` (no un id arbitrario) y
      `visibility = 'internal'`.
- [ ] Loguearse como cliente y confirmar que **no** hay forma de ver esos
      comentarios desde ninguna pantalla del cliente (son internos).

## 12. Control de Row Level Security (RLS)

Ejecutar con dos usuarios `cliente` distintos (A y B) y un `admin_pjm`.

- [ ] Usuario A no puede ver las simulaciones de Usuario B ni por
      `/simulaciones/[id de B]` (debe dar 404, no datos ajenos) ni en su
      propio `/dashboard`.
- [ ] Usuario A no puede ver la empresa de Usuario B.
- [ ] Usuario A no puede acceder a `/admin*` (ver punto 8).
- [ ] Con las Supabase credentials del cliente (anon key + sesión de A), un
      `select * from simulations` vía SQL Editor "Run as" (o vía la API
      REST con el JWT de A) sólo devuelve las simulaciones de A.
- [ ] admin_pjm sí puede ver/editar simulaciones, perfiles y empresas de
      cualquier cliente.
- [ ] Un cliente no puede escribir en `comments` (insert bloqueado por RLS)
      ni cambiar `pjm_requests.status` directamente (sólo admin_pjm puede
      hacer `update` en esa tabla — confirmado también por el fix de
      "insert-if-missing" en `requestFormalQuote`, que evita depender de
      permisos de `update` del lado del cliente).

---

## Notas para quien haga el QA

- **Promoción a admin_pjm**: el proxy (`src/proxy.ts` /
  `src/lib/supabase/middleware.ts`) lee el rol desde la tabla `profiles`
  (no desde el JWT), así que un `update profiles set role = 'admin_pjm'`
  alcanza para que el usuario entre a `/admin` sin tener que cerrar sesión.
  Aun así, para que el JWT también refleje el rol (por si algo más lo lee
  de `user_metadata` en el futuro), actualizá también
  `auth.users.raw_user_meta_data` — el bloque exacto está en el README.
- Cualquier error de Supabase que veas como texto crudo en inglés (SQL,
  nombres de policy, stack traces) en vez de un mensaje en español es un bug
  de esta sprint — reportalo señalando la acción exacta que lo disparó.
