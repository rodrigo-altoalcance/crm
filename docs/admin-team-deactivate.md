# Desactivar / reactivar / eliminar colaboradores de agencia

**Fecha:** 2026-10-15
**Área:** Super Admin — `/admin/team` (equipo de la agencia, roles `super_admin` y `agency_member`)
**Estado:** En producción (`main`), desplegado en `crm.altoalcance.cl`

## Qué se agregó

Antes solo se podía invitar colaboradores y cambiar su rol desde `/admin/team`. Ahora un `super_admin` también puede:

- **Desactivar** a un miembro: pierde acceso al panel de inmediato, reversible.
- **Reactivar** a un miembro desactivado.
- **Eliminar** a un miembro (ya existía, se le agregó un resguardo que faltaba — ver abajo).

## Decisión de diseño: sin tabla ni columna nueva

No se creó ninguna columna `active`/`status` en `profiles`, ni migración, ni política RLS nueva. El estado activo/inactivo se deriva 100% de un campo nativo de Supabase Auth: `banned_until`.

**Por qué esto es suficiente para bloquear el acceso de inmediato:** todo el proyecto usa `supabase.auth.getUser()` (no `getSession()`) tanto en `src/proxy.ts` como en `getProfile()` de cada ruta de API. `getUser()` siempre revalida la sesión contra el servidor de Supabase Auth en cada request — no se limita a decodificar el JWT local. En cuanto un usuario queda baneado, su siguiente request (de página o de API) falla la validación y se trata como no autenticado, sin tener que esperar a que expire el token ni modificar `proxy.ts`.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/auth/teamGuards.ts` | **Nuevo.** `isUserActive()`, `setUserBanned()` (ban/unban vía `admin.auth.admin.updateUserById`), `isLastActiveSuperAdmin()` |
| `src/app/api/admin/team/route.ts` | `GET` ahora enriquece cada perfil con `email` y `active` (cruce con `admin.auth.admin.listUsers()`) |
| `src/app/api/admin/team/[userId]/route.ts` | `PATCH` acepta `{ active: boolean }` además de `{ role }`; `DELETE` y el nuevo `PATCH active:false` validan el guard de "último super admin activo" |
| `src/app/admin/team/page.tsx` | Trae el estado de Auth (`listUsers`) y lo mergea con los perfiles antes de pasarlos al cliente |
| `src/app/admin/team/AdminTeamView.tsx` | Columna "Estado" (`Badge`), botón Desactivar (con `ConfirmDialog`, igual que Eliminar) y botón Reactivar (sin confirmación, no es destructivo) |

## Reglas de negocio implementadas

- Solo `super_admin` puede desactivar, reactivar o eliminar (ya se validaba así para invitar/cambiar rol).
- Nadie puede desactivarse ni eliminarse a sí mismo.
- **No se puede desactivar ni eliminar al último `super_admin` activo** — guard nuevo (`isLastActiveSuperAdmin`), antes faltaba también para `DELETE`.
- Desactivar pide confirmación en la UI (reutiliza `ConfirmDialog`); reactivar no, porque no es una acción destructiva.
- Un usuario desactivado puede reactivarse en cualquier momento (`ban_duration: "none"`).

## Qué pasa con los leads/tareas de un colaborador eliminado

Decisión tomada con el usuario: se deja el comportamiento ya existente en el esquema (`ON DELETE SET NULL` en `agency_leads.assigned_to`, `agency_tasks.assigned_to/created_by`, `agency_lead_activities.user_id`, `agency_task_comments.user_id`, `agency_client_activities.user_id`). Quedan sin responsable automáticamente, sin bloqueo ni flujo de reasignación forzada. No se tocó nada de este comportamiento porque ya era correcto.

## Cómo probarlo

1. Crear un `agency_member` de prueba desde `/admin/team`.
2. Desactivarlo → confirmar que pierde acceso a `/admin` en su siguiente request (no solo que se oculte el botón en la UI).
3. Reactivarlo → confirmar que recupera acceso.
4. Con un solo `super_admin` activo, intentar desactivarlo o eliminarlo → debe rechazarse con mensaje de error.
5. Eliminar la cuenta de prueba al terminar.

⚠️ No existe un proyecto Supabase separado para `dev` — todo apunta al mismo proyecto (`gjpixwdfxglekkkapklt`). Cualquier prueba de baneo/eliminación afecta usuarios reales de Auth; usar siempre una cuenta descartable, nunca un colaborador real.
