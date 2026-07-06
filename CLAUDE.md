@AGENTS.md

# Alto Alcance CRM — Contexto del proyecto

## Stack
- **Next.js 16.2.6** App Router + React 19 — `params` y `cookies()` son async (siempre `await`)
- **Supabase** (PostgreSQL + Auth + RLS) — proyecto `gjpixwdfxglekkkapklt`
- **Tailwind CSS v4** + shadcn/ui manual (sin CLI de red)
- **@supabase/ssr 0.10.3** — cliente server en `src/lib/supabase/server.ts`, browser en `client.ts`
- **Resend 6.x** — mailer base en `src/lib/email/mailer.ts`, remitente fijo `Alto Alcance CRM <noreply@altoalcance.cl>`, clave en `RESEND_API_KEY`
- **Sonner** para toasts, **@hello-pangea/dnd** para Kanban
- **Deploy**: Vercel (`crm.altoalcance.cl`) conectado a `rodrigo-altoalcance/crm` rama `main`

## Roles
| Rol | Acceso |
|-----|--------|
| `super_admin` | `/admin/*` — acceso completo, incluyendo datos financieros (pagos, fees) |
| `agency_member` | `/admin/*` — igual que super_admin EXCEPTO datos financieros (sin pagos, sin fees) |
| `company_admin` | `/dashboard/*` — Leads, Clientes, Equipo, Config |
| `seller` | `/dashboard/*` — según permisos en `profiles.permissions` (jsonb) |

### Rol agency_member — detalles
- Invitado desde `/admin/team` (solo super_admin puede invitar)
- El rol de miembros existentes puede cambiarse desde `/admin/team` con el ícono de lápiz — solo super_admin
- Accede a todo `/admin/*` excepto `/admin/companies/[id]/payments` (proxy lo redirige a `/admin`)
- API guard en rutas de pagos: `profile.role !== "super_admin"` — no cambiado
- Frontend oculta completamente (no muestra placeholder):
  - Dashboard admin: tarjeta "Ingresos mensuales", secciones "Próximos pagos" y "Últimos pagos"
  - `/admin/companies`: columna "Fee mensual", ítem "Pagos" en dropdown de acciones
  - `/admin/clients`: columna "Plan"
  - `/admin/companies/[id]`: tarjeta "Fee mensual", sección "Últimos pagos", botón "Pagos" en acciones rápidas
- Helper: `canViewFinancials(profile)` en `src/lib/auth/roles.ts` — retorna `true` solo para `super_admin`
- Helper: `isAgencyStaff(profile)` — retorna `true` para `super_admin` y `agency_member`
- RLS: función `is_agency_staff()` en BD (migración 014), usada en políticas de tablas de agencia
- Sidebar: ítem "Equipo" solo visible para `super_admin` (prop `role` pasado desde layout)

### Gestión de equipo de agencia (`/admin/team`)
- Componente cliente: `AdminTeamView` (`src/app/admin/team/AdminTeamView.tsx`)
- Lista miembros con roles `super_admin` y `agency_member`
- **Invitar**: botón "Invitar miembro" → dialog con nombre, email y selector de rol
- **Cambiar rol**: ícono lápiz por fila (oculto para el propio usuario) → dialog con selector → actualización optimista de la tabla
- **Eliminar**: ícono papelera → `ConfirmDialog` → elimina de `auth.users` (cascada borra el perfil)

API routes (todas requieren `super_admin`):
```
GET    /api/admin/team              → lista perfiles con role in ['super_admin', 'agency_member']
POST   /api/admin/team              → invita miembro { full_name, email, role } → generateInviteLink + sendInvitationEmail
PATCH  /api/admin/team/[userId]     → cambia rol { role } — verifica que el target tenga rol de agencia (anti-IDOR)
DELETE /api/admin/team/[userId]     → elimina de auth.users (no se puede eliminar a uno mismo)
```

## Estructura de rutas clave
```
src/
├── proxy.ts                    # Auth routing (Next.js 16: proxy en vez de middleware)
├── app/
│   ├── (auth)/login/                    # Login público
│   ├── (auth)/recuperar-contrasena/     # Solicitar link de recuperación (email)
│   ├── (auth)/nueva-contrasena/         # Establecer nueva contraseña (token Supabase)
│   ├── admin/                  # Panel super_admin
│   │   ├── companies/          # CRUD usuario empresa + pagos + usuarios + pipeline + equipo
│   │   │   └── [id]/leads/     # Pipeline (Kanban+tabla) de la empresa — acceso directo sin impersonar
│   │   │   └── [id]/team/      # Equipo de la empresa — invitar colaboradores desde admin
│   │   │   └── [id]/integrations/ # Webhooks + campos personalizados empresa
│   │   ├── leads/              # Leads globales de la agencia (agency_leads)
│   │   │   └── [id]/           # Detalle: botón "Convertir en cliente" si is_final=true
│   │   ├── clients/            # Empresas clientes de la agencia (tabla companies)
│   │   │   └── [companyId]/    # Ficha de cliente: header + historial de actividades
│   │   └── settings/
│   │       ├── emails/         # Templates: bienvenida + invitación + cobranza (Resend)
│   │       └── integrations/   # Webhooks agencia + campos personalizados agencia
│   ├── dashboard/              # Portal empresa
│   │   ├── leads/              # Kanban + tabla + detalle
│   │   ├── clients/            # Clientes convertidos + registros
│   │   ├── tasks/              # Mis tareas (label en sidebar y h1)
│   │   ├── team/               # Equipo + permisos
│   │   └── settings/           # Etapas, Org, Integraciones, Campos
│   └── api/
│       ├── admin/              # companies, leads, clients, impersonate, email-templates
│       │   ├── companies/[companyId]/tokens/           # CRUD tokens webhook
│       │   ├── companies/[companyId]/leads/            # CRUD leads empresa (admin directo)
│       │   │   └── [leadId]/{stage,activities,tasks,custom-field-values}/
│       │   ├── companies/[companyId]/team/             # Invitar/gestionar equipo empresa
│       │   ├── companies/[companyId]/users/[userId]/           # PATCH perfil (full_name, role, phone)
│       │   │   ├── resend-invite/                              # POST — reenviar invitación
│       │   │   └── password/                                   # PATCH — cambiar contraseña (admin)
│       │   ├── companies/[companyId]/custom-fields/    # CRUD campos personalizados empresa
│       │   └── companies/[companyId]/column-preferences/ # Preferencias columnas (super_admin)
│       │   ├── clients/                                  # GET lista, POST crear empresa cliente
│       │   │   └── [companyId]/activities/               # GET+POST actividades de cliente
│       │   │       └── [activityId]/                     # DELETE actividad
│       │   ├── dashboard/
│       │   │   ├── leads-by-company/  # GET ?days=7|15|30 — leads abiertos/cerrados por empresa
│       │   │   └── activity-ranking/  # GET ?days=7|15|30 — top 10 empresas por actividad total
│       │   └── agency/
│       │       ├── tokens/            # CRUD tokens webhook agencia
│       │       ├── leads/[id]/{stage,activities,tasks,custom-field-values}/
│       │       ├── custom-fields/     # CRUD campos personalizados agencia
│       │       └── column-preferences/
│       ├── leads/[id]/         # stage, activities, tasks, custom-field-values
│       ├── settings/
│       │   ├── tokens/         # CRUD tokens webhook empresa
│       │   ├── custom-fields/  # CRUD campos personalizados empresa
│       │   └── column-preferences/  # Preferencias columnas por usuario
│       ├── webhook/leads/[token]/   # Público — Make.com (empresa)
│       ├── webhook/agency/[token]/  # Público — Make.com (agencia)
│       ├── notifications/       # GET lista, PATCH read, PATCH read-all
│       │   └── [id]/read/
│       ├── cron/
│       │   └── task-due-notifications/  # POST — cron Vercel (requiere CRON_SECRET)
│       ├── team/, tasks/, stages/
│       └── admin/test-email/   # POST — prueba de envío (solo super_admin)
├── components/
│   ├── ui/                     # shadcn manual: button, card, dialog, dropdown-menu, etc.
│   ├── admin/                  # CompanyForm, ClientPaymentPanel, AdminSidebar, InviteUserForm, CompanyUsersClient, etc.
│   ├── leads/                  # LeadsKanban, LeadDetailPanel, LeadsTable, LeadsView, CloseLeadConfirmDialog
│   ├── dashboard/              # DashboardSidebar, ImpersonationBanner
│   ├── clients/                # ClientsTable, ClientRecordsPanel
│   ├── tasks/, team/           # TeamView acepta apiPrefix + permissionsBasePath
│   ├── settings/               # WebhookConfig, FieldMappingEditor, CustomLeadFieldsEditor, StagesEditor, OrganizationForm, FieldsEditor
│   └── shared/                 # EmptyState, ConfirmDialog, StatusBadge, PriorityBadge, TopBar, NotificationBell
└── lib/
    ├── supabase/{client,server,admin,middleware}.ts
    ├── auth/{getProfile,roles}.ts
    ├── email/mailer.ts         # sendEmail({ to, subject, html }) — usa RESEND_API_KEY
    ├── email/welcome.ts        # sendWelcomeEmail({ to, companyName, verificationLink }) — usa template de BD
    ├── email/invitation.ts     # sendInvitationEmail({ to, inviteeName, companyName, inviteLink }) — usa template BD
    └── utils.ts                # cn(), formatCLP(), formatDate(), formatScheduledAt(), toSnakeCase()
```

## Patrones críticos

### Company ID (impersonación)
```typescript
const cookieStore = await cookies()
const impersonatedId = cookieStore.get("impersonated_company")?.value
const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
```

### API route template
```typescript
const supabase = await createClient()
const profile = await getProfile(supabase)
if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
const cookieStore = await cookies()
const impersonatedId = cookieStore.get("impersonated_company")?.value
const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })
```

### NUNCA usar subqueries anidadas en .in()
```typescript
// ❌ ROMPE en runtime
.in("stage_id", supabase.from("lead_stages").select("id").eq("is_final", true) as any)

// ✅ Correcto: dos queries separadas
const { data: stages } = await supabase.from("lead_stages").select("id").eq("is_final", true)
const ids = (stages || []).map(s => s.id)
if (ids.length > 0) await supabase.from("leads").select("*").in("stage_id", ids)
```

## Seguridad — reglas de desarrollo API

Estas reglas surgieron de un audit de seguridad completo sobre las 73 rutas de `src/app/api/`. Aplicar en toda ruta nueva.

### 1. Siempre filtrar por `company_id` en queries (BOLA/IDOR)

Cualquier query que lea o escriba datos de una empresa **debe** incluir `.eq("company_id", companyId)`. Sin ese filtro, un usuario autenticado de Empresa A puede leer datos de Empresa B conociendo el UUID.

```typescript
// ❌ BOLA — sin filtro de empresa
supabase.from("leads").select("*").eq("id", leadId)

// ✅ Correcto — scoped por empresa
supabase.from("leads").select("*").eq("id", leadId).eq("company_id", companyId)
```

Aplica también a recursos relacionados: antes de leer actividades, tareas o comentarios de un lead, verificar que ese lead pertenece a la empresa:
```typescript
const { data: lead } = await supabase.from("leads").select("id")
  .eq("id", leadId).eq("company_id", companyId).single()
if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })
```

### 2. Nunca pasar `body` completo a `.update()` (mass assignment)

Siempre desestructurar solo los campos permitidos antes de actualizar.

```typescript
// ❌ Mass assignment — cualquier campo del body va a la BD
supabase.from("leads").update(body).eq("id", id)

// ✅ Whitelist explícita
const { first_name, last_name, email, phone, message, source, assigned_to, scheduled_at } = body
supabase.from("leads").update({ first_name, last_name, email, phone, message, source, assigned_to, scheduled_at })
  .eq("id", id).eq("company_id", companyId)
```

Whitelists de referencia por tabla:
- `leads` (dashboard PATCH): `first_name, last_name, email, phone, message, source, assigned_to, scheduled_at` — **excluir `stage_id`** (va por `/stage` con comentario obligatorio)
- `leads` / `agency_leads` (admin PATCH): agregar `stage_id`
- `lead_stages` / `agency_stages`: `name, color, position, is_final, is_lost`
- `custom_lead_fields`: `nombre, tipo, obligatorio, orden`
- `lead_field_definitions`: `name, label, type, options, required, position`
- `email_templates`: `name, subject, body_html, type, is_default`
- `companies`: `name, monthly_fee, currency, payment_day, max_users, status, email, phone, address, website, next_payment_date, org_name, org_email, org_phone, org_website`
- `profiles` (admin PATCH): `full_name, role, phone` — **excluir email** (no está en profiles, está en auth.users)

### 3. `createAdminClient()` bypasea RLS — requiere checks manuales

Cuando se usa `createAdminClient()`, no hay RLS de respaldo. Toda validación de pertenencia debe hacerse explícitamente en el código.

```typescript
// ❌ Admin client sin check de company — cualquier lead accesible
const admin = createAdminClient()
admin.from("lead_activities").select("*").eq("lead_id", leadId)

// ✅ Verificar primero que el lead pertenece a la empresa
const { data: lead } = await admin.from("leads").select("id")
  .eq("id", leadId).eq("company_id", companyId).single()
if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })
```

Rutas que usan `createAdminClient()` (requieren especial atención):
- `/api/admin/companies/[id]/leads/**` — todas filtran por `company_id`
- `/api/admin/companies/[id]/users/[userId]/**` — verifican que el perfil pertenece a `company_id` antes de mutar
- `/api/admin/agency/leads/**` — agency no tiene company_id, pero sí super_admin check
- `/api/webhook/leads/[token]` y `/api/webhook/agency/[token]` — público, el token provee el company_id

### 4. Cookie de impersonación — configuración obligatoria

```typescript
// ✅ Siempre con estas opciones
cookieStore.set("impersonated_company", company_id, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
})
```

La cookie solo se lee en server components (`cookies()` de `next/headers`) — nunca con `document.cookie`. El `httpOnly: true` no rompe nada.

### 5. Redirects en `proxy.ts` — usar origen fijo

```typescript
// ❌ Open redirect potencial — host manipulable
NextResponse.redirect(new URL("/login", request.url))

// ✅ Origen fijo
const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://crm.altoalcance.cl"
NextResponse.redirect(new URL("/login", origin))
```

### 6. Validar payload de webhooks con Zod

El webhook público en `/api/webhook/leads/[token]` tiene un schema Zod definido que **debe** ejecutarse:

```typescript
const result = payloadSchema.safeParse(await request.json())
if (!result.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
rawBody = result.data
```

### 7. Uploads de archivo — validar MIME y extensión

```typescript
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]
const ALLOWED_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "svg"]
const ext = (file.name.split(".").pop() || "").toLowerCase()
if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTS.includes(ext)) {
  return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 })
}
```

### 8. `crm_settings` — solo claves permitidas

```typescript
const ALLOWED_KEYS = ["agency_name", "agency_email", "agency_address", "agency_phone", "agency_website", "agency_logo_url"]
const upserts = Object.entries(body)
  .filter(([key]) => ALLOWED_KEYS.includes(key))
  .map(([key, value]) => ({ key, value: String(value), updated_at: new Date().toISOString() }))
```

## DB — Tablas principales
```
companies                    id, name, monthly_fee, currency, payment_day, max_users, status, org_*
profiles                     id(=auth.uid), company_id, role, full_name, permissions(jsonb)
leads                        id, company_id, stage_id, first_name, last_name, email, phone, source, custom_fields(jsonb), scheduled_at(timestamptz)
lead_stages                  id, company_id, name, color, position, is_final, is_lost
lead_activities              id, lead_id, user_id, type, description, metadata(jsonb)
tasks                        id, company_id, lead_id, title, priority, status, assigned_to, due_date
webhook_tokens               id, company_id, token(uuid), name, field_mapping(jsonb)
lead_field_definitions       id, company_id, name, label, type, options(jsonb), position
client_records               id, lead_id, company_id, title, description, type, record_date
payments                     id, company_id, amount, currency, paid_at (super_admin only)
email_templates              id, name, subject, body_html, type('billing'|'welcome'|'invitation'), is_default
crm_settings                 key, value  (agency_name, agency_email)
agency_leads                 id, stage_id, first_name, last_name, email, phone, source, message, custom_fields(jsonb), assigned_to, scheduled_at(timestamptz), created_at, updated_at
agency_stages                id, name, color, position, is_final, is_lost
agency_lead_activities       id, lead_id, user_id, type, description, metadata(jsonb)
agency_tasks                 id, lead_id, title, priority, status, assigned_to, due_date
notifications                id, user_id(FK→auth.users CASCADE), type('task_assigned'|'task_due'), title, body, related_task_id(UUID soft ref), read_at(timestamptz), created_at
custom_lead_fields           id, context('agency'|'company'), company_id(null si agencia), nombre, tipo('texto'|'numero'|'fecha'), obligatorio, orden, created_at
custom_lead_field_values     id, field_id(FK→custom_lead_fields), lead_id(UUID sin FK), valor, created_at
user_lead_column_preferences id, user_id, context, company_id, column_key, visible, created_at
agency_client_activities     id, company_id(FK→companies CASCADE), user_id(FK→profiles SET NULL), type('reunion'|'llamada'|'nota'|'acuerdo'|'reporte'|'otro'), title, description, activity_date(date), created_at
```

## Permisos sellers (profiles.permissions jsonb)
```json
{"can_view_all_leads": true, "can_create_leads": true, "can_edit_leads": true,
 "can_delete_leads": false, "can_close_leads": true, "can_view_reports": true, "can_manage_stages": false}
```

## Email — Resend

### Mailer base
```typescript
import { sendEmail } from "@/lib/email/mailer"
await sendEmail({ to: "...", subject: "...", html: "..." })
```
- Remitente siempre fijo: `Alto Alcance CRM <noreply@altoalcance.cl>`
- Variable de entorno: `RESEND_API_KEY` (en `.env.local` local y en Vercel)
- Lanza error descriptivo si la key no está configurada

### Ruta de prueba
`POST /api/admin/test-email` — solo `super_admin`, body: `{ "to": "email@ejemplo.com" }`

### Templates de email (BD)
- `email_templates.type = 'billing'` — templates de cobranza, editables desde `/admin/settings/emails`
- `email_templates.type = 'welcome'` — template de bienvenida legacy, **uno por defecto** (`is_default=true`)
- `email_templates.type = 'invitation'` — template de invitación, **uno por defecto** (`is_default=true`) — migración `005`
- El `EmailTemplateForm` muestra variables según el tipo:
  - `billing` → `{{cliente_nombre}}`, `{{monto}}`, `{{fecha_vencimiento}}`, `{{agencia_nombre}}`, `{{agencia_email}}`
  - `welcome` → `{{nombre_empresa}}`, `{{email}}`, `{{link_verificacion}}`
  - `invitation` → `{{nombre_invitado}}`, `{{nombre_empresa}}`, `{{link_invitacion}}`

### Flujo de invitación (equipo y usuarios empresa)
```typescript
import { sendInvitationEmail } from "@/lib/email/invitation"
await sendInvitationEmail({ to, inviteeName, companyName, inviteLink })
```
- **Todos los flujos de invitación** usan `generateLink({ type: 'invite' })` + `sendInvitationEmail()` — el usuario invitado hace clic en el link y crea su propia contraseña
- **Flujos que lo usan:**
  - `POST /api/team` — company_admin invita sellers desde el dashboard
  - `POST /api/admin/companies/[id]/users` — super_admin crea usuario empresa
  - `POST /api/admin/companies/[id]/team` — super_admin invita colaboradores desde panel admin
- El formulario `InviteUserForm` ya **no pide contraseña** — solo nombre, email y rol
- El formulario `InviteTeamMemberForm` acepta prop `apiPrefix` (default `/api`) para ser reutilizado desde admin

### Módulo "Usuario Empresa" (ruta `/admin/companies`)
- La UI usa el término **"Usuario Empresa"** (no "Empresas") en menú, títulos y breadcrumbs
- El módulo gestiona: datos de la empresa, pagos, usuarios, tokens webhook, **pipeline y equipo**
- Flujo de activación: admin envía invitación → Supabase genera invite link → se envía email de invitación → usuario hace clic → crea contraseña → cuenta activada

### Gestión de usuarios desde admin (`/admin/companies/[id]/users`)
- Componente cliente: `CompanyUsersClient` (`src/components/admin/CompanyUsersClient.tsx`)
- La page.tsx carga perfiles con `createClient()` y complementa con datos de `auth.users` via `admin.auth.admin.listUsers()` → tipo `UserWithAuth = Profile & { email: string; email_confirmed_at: string | null }`
- La tabla muestra: Nombre, **Email** (texto seleccionable), Rol, Teléfono, Miembro desde, Acciones
- Badge **"Pendiente"** (amber) junto al email si `email_confirmed_at === null`
- **Botón "Reenviar invitación"** — solo visible si `email_confirmed_at === null`; llama a `POST /api/admin/companies/[id]/users/[userId]/resend-invite` → usa `generateInviteLink()` (recovery link si el usuario ya existe) + `sendInvitationEmail()`
- **Botón "Editar"** — abre `Dialog` con campos: Nombre completo (editable), Email (readonly), Rol (company_admin | seller), Teléfono → `PATCH /api/admin/companies/[id]/users/[userId]`
- **Sección "Cambiar contraseña"** dentro del mismo modal (visualmente separada por `<Separator />`, opcional) → `PATCH /api/admin/companies/[id]/users/[userId]/password` — usa `admin.auth.admin.updateUserById(userId, { password })`; valida mínimo 8 caracteres
- Actualización optimista: al guardar edición, `setUsers()` actualiza la tabla sin `router.refresh()`

API routes (todas requieren `super_admin`, usan `createAdminClient()`):
```
POST   /api/admin/companies/[id]/users/[userId]/resend-invite → reenvía email de invitación
PATCH  /api/admin/companies/[id]/users/[userId]               → edita perfil { full_name, role, phone }
PATCH  /api/admin/companies/[id]/users/[userId]/password      → cambia contraseña (min 8 chars)
```
Todas verifican que `profiles.company_id = id` (anti-IDOR) antes de cualquier mutación.

### Pipeline de empresa desde admin (`/admin/companies/[id]/leads`)
- Acceso directo al Kanban/tabla de leads de una empresa **sin impersonar**
- Usa `createAdminClient()` en todas las API routes — bypasea RLS, filtra por `company_id` de la URL
- `LeadsView` recibe `basePath="/admin/companies/[id]/leads"` y `apiPrefix="/api/admin/companies/[id]"`
- API routes disponibles (todas requieren `super_admin`):
```
GET/POST  /api/admin/companies/[id]/leads
GET/PATCH/DELETE  /api/admin/companies/[id]/leads/[leadId]
PATCH     /api/admin/companies/[id]/leads/[leadId]/stage
GET/POST  /api/admin/companies/[id]/leads/[leadId]/activities
GET/POST  /api/admin/companies/[id]/leads/[leadId]/tasks
PATCH     /api/admin/companies/[id]/leads/[leadId]/custom-field-values
```

### Módulo Equipo de empresa desde admin (`/admin/companies/[id]/team`)
- `TeamView` acepta props `apiPrefix` y `permissionsBasePath` para ser reutilizado desde admin
- API routes (todas requieren `super_admin`, usan `createAdminClient()`):
```
GET/POST    /api/admin/companies/[id]/team          → listar / invitar colaborador
PATCH/DELETE /api/admin/companies/[id]/team/[userId] → editar permisos / eliminar
```

## Flujos especiales
- **Cierre de lead**: etapa con `is_final=true` → aparece automáticamente en módulo Clientes
- **Impersonación**: `POST /api/admin/impersonate` → cookie `impersonated_company` → super_admin ve el portal de la empresa
- **Webhook Make.com**: `POST /api/webhook/leads/[token]` (público) → mapea campos via `field_mapping` del token → asigna lead a primera etapa del pipeline
- **Pagos**: solo super_admin puede ver/crear pagos — RLS lo bloquea para otros roles

## Recuperación de contraseña

Flujo completo implementado con Supabase Auth:

1. Link "¿Olvidaste tu contraseña?" en `LoginForm.tsx` → `/recuperar-contrasena`
2. `/recuperar-contrasena` — el usuario ingresa su email → llama `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + "/nueva-contrasena" })` → Supabase envía email con link
3. `/nueva-contrasena` — detecta el token via `onAuthStateChange("PASSWORD_RECOVERY")` → usuario ingresa nueva contraseña → llama `supabase.auth.updateUser({ password })`

**Configuración requerida en Supabase:** agregar `https://crm.altoalcance.cl/nueva-contrasena` en **Authentication → URL Configuration → Redirect URLs**.

Ambas rutas son accesibles sin autenticación — el `proxy.ts` solo bloquea `/`, `/admin/*` y `/dashboard/*` para usuarios no autenticados.

## Gestión de usuarios — ciclo de vida y BD

### Cascadas al eliminar un usuario
`profiles.id` tiene `ON DELETE CASCADE` desde `auth.users` → borrar el usuario de auth borra el perfil automáticamente.
Las demás tablas usan `ON DELETE SET NULL` (no eliminan datos, solo anulan la referencia):

| Tabla | Columna |
|-------|---------|
| `leads` | `assigned_to` |
| `lead_activities` | `user_id` |
| `tasks` | `assigned_to`, `created_by` |
| `client_records` | `created_by` |
| `task_comments` | `user_id` |
| `agency_leads` | `assigned_to` |
| `agency_lead_activities` | `user_id` |
| `agency_tasks` | `assigned_to`, `created_by` |
| `agency_task_comments` | `user_id` |

`payments.recorded_by` y `admin_audit_log.user_id` no tienen FK — quedan como UUID huérfano, no es crítico.

### Error "ya existe" al re-invitar un email
Ocurre cuando el usuario fue eliminado de `profiles` (o `company_id` puesto en null) pero **sigue existiendo en `auth.users`**. Supabase rechaza el nuevo invite con error 422.

**Solución**: eliminar directamente desde `auth.users` en el SQL Editor de Supabase:
```sql
DELETE FROM auth.users WHERE email = 'email@ejemplo.com';
-- El perfil se borra en cascada automáticamente.
```
Después se puede re-invitar normalmente desde `/admin/companies/[id]/users`.

### Verificar dónde aparece un usuario antes de eliminarlo
```sql
SELECT id, email, created_at FROM auth.users WHERE email = 'email@ejemplo.com';
SELECT id, company_id, role, full_name FROM profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'email@ejemplo.com');
```

## Integraciones webhook — arquitectura

### Acceso por rol
| Rol | Ruta | API usada |
|-----|------|-----------|
| `company_admin` | `/dashboard/settings/integrations` | `/api/settings/tokens` (lee cookie `impersonated_company`) |
| `super_admin` (agencia) | `/admin/settings/integrations` | `/api/admin/agency/tokens` |
| `super_admin` (empresa) | `/admin/companies/[id]/integrations` | `/api/admin/companies/[companyId]/tokens` (sin cookie, `createAdminClient`) |

### Componentes reutilizables
- `WebhookConfig` acepta prop `apiPrefix` (default `/api/settings`) y `webhookPath` — úsalo para apuntar a distinto backend
- `CustomLeadFieldsEditor` acepta prop `apiPrefix` — construye el subpath `/custom-fields` automáticamente

### Campos soportados en el webhook
Campos estándar (van a columnas del lead): `first_name/nombre`, `last_name/apellido`, `email/correo`, `phone/telefono/fono`, `message/mensaje`, `source/origen`

Campos especiales (van a `custom_fields` jsonb, auto-detectados sin mapeo):
- `empresa` — nombre de la empresa del lead
- `fecha_agenda` — fecha de la cita/reunión agendada
- `fecha_registro` — fecha en que se registró el lead en el sistema origen

### Mapeo de campos
El `field_mapping` del token convierte claves del payload entrante → campos CRM.
Si la clave CRM empieza con `custom:` → va a `custom_fields[key]`. De lo contrario → campo directo del lead.
```typescript
// Ejemplo: Make envía { "scheduled": "2025-06-01" }
// field_mapping: { "scheduled": "custom:fecha_agenda" }
// Resultado: lead.custom_fields.fecha_agenda = "2025-06-01"
```

### API admin de tokens (super_admin, usa createAdminClient — bypasea RLS)
```
GET    /api/admin/companies/[companyId]/tokens         → lista tokens
POST   /api/admin/companies/[companyId]/tokens         → crea token { name }
PATCH  /api/admin/companies/[companyId]/tokens         → actualiza field_mapping { id, field_mapping }
DELETE /api/admin/companies/[companyId]/tokens/[id]    → elimina token
POST   /api/admin/companies/[companyId]/tokens/[id]    → regenera token (elimina y recrea)
```

## Campos personalizados de lead — arquitectura

### Tablas
- `custom_lead_fields` — define campos por contexto (`agency` | `company`). `company_id` es NULL si context=agency.
- `custom_lead_field_values` — valores de esos campos por lead. `lead_id` es UUID sin FK explícita (puede ser `leads.id` o `agency_leads.id`).
- `user_lead_column_preferences` — preferencia de visibilidad de columnas por usuario, contexto y empresa.

### Acceso por contexto
| Contexto | API campos | API column-prefs | API valores |
|----------|-----------|-----------------|-------------|
| Dashboard empresa | `/api/settings/custom-fields` | `/api/settings/column-preferences` | `PATCH /api/leads/[id]/custom-field-values` |
| Admin agencia | `/api/admin/agency/custom-fields` | `/api/admin/agency/column-preferences` | `PATCH /api/admin/agency/leads/[id]/custom-field-values` |
| Admin → empresa | `/api/admin/companies/[id]/custom-fields` | `/api/admin/companies/[id]/column-preferences` | `PATCH /api/admin/companies/[id]/leads/[leadId]/custom-field-values` |

### Componente `CustomLeadFieldsEditor`
Props: `initialFields: CustomLeadField[]`, `apiPrefix: string`
- Llama a `${apiPrefix}/custom-fields` para CRUD de campos
- Llama a `${apiPrefix}/custom-fields/[id]` para PATCH (reordenar) y DELETE
- Muestra campos fijos como referencia no editable
- Genera JSON para Make con `toSnakeCase(field.nombre)` como clave
- Botón "Copiar JSON" copia al portapapeles con toast "¡Copiado!"

### Componente `LeadsView` — columnas dinámicas
Props nuevas: `customFields`, `initialColumnPrefs`, `fieldValuesMap`, `columnPrefsApiPrefix`
- Botón "Columnas" (solo en vista tabla, solo si hay campos personalizados) abre `DropdownMenuCheckboxItem` por cada campo
- Toggle llama `PATCH ${columnPrefsApiPrefix}/column-preferences` con `{ column_key: field.id, visible }`
- Default: todos los campos personalizados **ocultos** hasta que el usuario los active

### Componente `LeadDetailPanel` — sección "Información adicional"
Props nuevas: `customFields?: CustomLeadField[]`, `initialFieldValues?: Record<string, string>`
- Muestra TODOS los campos del contexto (independiente de preferencias de columna)
- Edición inline: un campo a la vez, input del tipo correspondiente (text/number/date)
- Al guardar: `PATCH ${apiPrefix}/leads/${lead.id}/custom-field-values` con `{ field_id, valor }`
- Actualización optimista del estado local, sin `router.refresh()`
- Si no hay campos personalizados, la sección no se renderiza

### Webhook + campos personalizados
Al recibir POST en el webhook, después de crear el lead:
1. Se consultan los `custom_lead_fields` del contexto/empresa
2. Para cada campo, se calcula `toSnakeCase(field.nombre)` → se busca esa clave en `rawBody`
3. Si existe, se inserta en `custom_lead_field_values`
4. Los campos fijos se siguen guardando exactamente igual (sin tocar esa lógica)

### Utility `toSnakeCase(str)`
En `src/lib/utils.ts` — convierte nombre de campo a clave snake_case sin tildes ni caracteres especiales:
```typescript
toSnakeCase("Empresa del cliente") // → "empresa_del_cliente"
toSnakeCase("Teléfono celular")    // → "telefono_celular"
```

### Cómo cargar datos en page.tsx de listado
```typescript
// Cargar campos + preferencias + valores en paralelo
const [{ data: customFields }, { data: columnPrefsRows }] = await Promise.all([
  supabase.from("custom_lead_fields").select("*").eq("context", "company").eq("company_id", companyId).order("orden"),
  supabase.from("user_lead_column_preferences").select("column_key, visible").eq("user_id", profile.id).eq("context", "company").eq("company_id", companyId),
])

// Construir mapa de preferencias
const initialColumnPrefs: Record<string, boolean> = {}
for (const row of columnPrefsRows || []) initialColumnPrefs[row.column_key] = row.visible

// Cargar valores para todos los leads visibles (solo si hay campos definidos)
const leadIds = (leads || []).map(l => l.id)
let fieldValuesMap: Record<string, Record<string, string>> = {}
if (leadIds.length > 0 && (customFields || []).length > 0) {
  const { data: allValues } = await supabase
    .from("custom_lead_field_values").select("lead_id, field_id, valor").in("lead_id", leadIds)
  for (const v of allValues || []) {
    if (!fieldValuesMap[v.lead_id]) fieldValuesMap[v.lead_id] = {}
    fieldValuesMap[v.lead_id][v.field_id] = v.valor ?? ""
  }
}
```

### Cómo cargar datos en page.tsx de detalle
```typescript
const [{ data: customFields }, { data: fieldValueRows }] = await Promise.all([
  supabase.from("custom_lead_fields").select("*").eq("context", "company").eq("company_id", companyId).order("orden"),
  supabase.from("custom_lead_field_values").select("field_id, valor").eq("lead_id", id),
])
const initialFieldValues: Record<string, string> = {}
for (const v of fieldValueRows || []) initialFieldValues[v.field_id] = v.valor ?? ""
```

## Campo scheduled_at — Fecha de agenda inicial

- Columnas: `leads.scheduled_at TIMESTAMPTZ NULL` y `agency_leads.scheduled_at TIMESTAMPTZ NULL` — migración `007`
- Llenado manualmente, nunca automático
- Aparece en: formulario de creación (`NewLeadForm`), detalle del lead (edición inline con ícono lápiz → input → ✓/✗), columna en tabla (`LeadsTable`), tarjeta kanban (`LeadCard` — solo si tiene valor, en indigo)
- Formato de visualización siempre `DD/MM/YYYY HH:mm` en zona `America/Santiago` via `formatScheduledAt()` de `src/lib/utils.ts`
- Para convertir datetime-local a ISO al guardar: `new Date(value).toISOString()`
- El PATCH de edición inline llama a `${apiPrefix}/leads/${lead.id}` con `{ scheduled_at: isoString | null }`
- Contexto admin agencia: API route `PATCH /api/admin/agency/leads/[id]` — usa `createAdminClient()`, bypasea RLS

## Módulo "Mis tareas" (`/dashboard/tasks`) y Tareas de Agencia (`/admin/tasks`)

- Label en sidebar y h1 de página dashboard: **"Mis tareas"** (no "Tareas")
- El botón "Nueva tarea" fue eliminado de `TasksView` — la creación de tareas solo se hace desde el detalle de un lead
- `TasksView` sigue mostrando el modal de detalle al hacer clic en una tarea existente
- El filtro de estado es **radio** (un estado a la vez), default `"pending"` — no multi-select

### Datos enriquecidos del lead en tareas

La columna "Lead" de `TasksView` y la sección "Lead asociado" de `TaskDetailModal` muestran:
- Nombre del lead (siempre)
- Teléfono (`phone`)
- Email (`email`)
- Último comentario del historial (`last_comment`, `line-clamp-2` en lista, `line-clamp-3` en modal)

**Cómo cargar estos datos en el `page.tsx`** (aplica igual para dashboard y admin agencia, cambiando las tablas):
```typescript
// 1. Incluir phone y email en el join del lead
.select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url), lead:leads(id, first_name, last_name, phone, email)")

// 2. Query separada para el último comentario por lead
const leadIds = (tasks || []).filter((t) => t.lead_id).map((t) => t.lead_id as string)
const lastCommentMap: Record<string, string> = {}
if (leadIds.length > 0) {
  const { data: recentActivities } = await supabase
    .from("lead_activities")               // admin agencia: agency_lead_activities
    .select("lead_id, description, created_at")
    .in("lead_id", leadIds)
    .in("type", ["stage_changed", "lead_closed", "note_added", "comment", "task_completed"])
    .not("description", "is", null)
    .order("created_at", { ascending: false })
  for (const act of recentActivities || []) {
    if (act.lead_id && !(act.lead_id in lastCommentMap) && act.description) {
      lastCommentMap[act.lead_id] = act.description
    }
  }
}

// 3. Adjuntar last_comment a cada tarea
const tasksWithExtra = (tasks || []).map((t) => ({
  ...t,
  lead: t.lead ? { ...(t.lead as any), last_comment: lastCommentMap[t.lead_id!] ?? null } : t.lead,
}))
```
Los datos se acceden como `(task as any).lead.phone` / `.email` / `.last_comment` en los componentes.

### `TaskDetailModal` — un solo textarea a la vez

- Cuando el usuario selecciona un estado diferente al actual (`pendingStatus !== null`), el formulario de "Agregar comentario libre" se **oculta** — solo permanece visible el textarea de "Comenta qué hiciste...".
- Una vez guardado o cancelado el cambio de estado, el textarea de comentario libre vuelve a aparecer.
- Implementado con `{!pendingStatus && (<form onSubmit={handleAddComment}>...)}` alrededor del formulario libre.

## Kanban — popup de mover lead

- El `Dialog` de comentario obligatorio al mover un lead muestra el título: `"Mover lead: {first_name} {last_name}"`
- Componente: `LeadsKanban.tsx`

## Módulo de leads — mejoras (aplica a admin agencia y dashboard empresa)

### Buscador en tiempo real
- Input en `LeadsView.tsx` a la derecha del toggle kanban/lista
- Filtra en memoria con `useMemo` — busca por nombre, email y teléfono
- Al cambiar de vista kanban↔lista el filtro se mantiene

### Último comentario en tarjeta del kanban
- `LeadCard.tsx` muestra `(lead as any).last_comment` con `line-clamp-2` debajo del nombre
- El campo se carga en el `page.tsx` de listado con una query adicional a `lead_activities` / `agency_lead_activities`:
```typescript
// Tipos incluidos: stage_changed, lead_closed, note_added, comment, task_completed
const lastCommentMap: Record<string, string> = {}
for (const act of recentActivities || []) {
  if (act.lead_id && !(act.lead_id in lastCommentMap) && act.description) {
    lastCommentMap[act.lead_id] = act.description
  }
}
// Adjuntar al mapear leads: { ...l, last_comment: lastCommentMap[l.id] ?? null }
```

### Scroll horizontal en kanban
- Patrón correcto: wrapper exterior con `overflow-x-auto w-full`, flex interno con `min-w-max`
- El `DragDropContext` queda DENTRO del wrapper con scroll (requerido por `@hello-pangea/dnd`)
```tsx
<div className="overflow-x-auto w-full pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
  <DragDropContext onDragEnd={onDragEnd}>
    <div className="flex gap-4 min-w-max">
      {/* columnas */}
    </div>
  </DragDropContext>
</div>
```

### Filtro del buscador en kanban
- `LeadsKanban` tiene `useState(initialLeads)` para updates optimistas del drag & drop
- Sin `useEffect`, el kanban ignora cambios del prop (buscador no filtra desde kanban)
- Solución: `useEffect(() => { setLeads(initialLeads) }, [initialLeads])`

### Comentario sin cambiar etapa en LeadDetailPanel
- El campo de comentario existente en "Cambiar etapa" permite guardar sin requerir cambio
- Si `hasChanges` → PATCH a `stage` con comentario; si no → POST a `activities` con `type: "comment"`
- El botón siempre dice "Guardar", habilitado con solo texto (no requiere cambio de etapa)

### Editar tarea desde el detalle del lead
- `TaskDetailModal` acepta `canEdit?: boolean` y `teamMembers?: Profile[]`
- Cuando `canEdit=true` aparece botón "Editar" que activa formulario inline (título, fecha límite, responsable)
- PATCH al endpoint de tasks, sin generar entrada en el historial del lead
- `LeadTasksPanel` acepta `canEdit?: boolean` y lo propaga al modal
- En admin agencia (`/admin/leads/[id]`): `canEdit={true}` siempre
- En dashboard empresa (`/dashboard/leads/[id]`): `canEdit={role === "super_admin" || role === "company_admin" || permissions?.can_edit_leads}`

## Patrón crítico — mapping manual de Lead desde agencyLead (admin agencia)

En `/admin/leads/[id]/page.tsx`, el objeto `Lead` se construye manualmente desde `agencyLead` (que viene de `agency_leads`). El tipo `AgencyLead` no siempre tiene todos los campos del tipo `Lead` — si el campo existe en la BD pero no en `AgencyLead`, usar `(agencyLead as any).campo`.

```typescript
// ✅ Incluir TODOS los campos del tipo Lead al mapear desde agencyLead
const lead: Lead = {
  ...
  scheduled_at: (agencyLead as any).scheduled_at ?? null,  // campo en BD pero no en AgencyLead
  ...
}
```

Si se agrega una columna nueva a `agency_leads`, hay que actualizar también la interfaz `AgencyLead` en `src/types/database.ts`.

## Patrón crítico — actualización optimista de campos editables inline

`router.refresh()` es asíncrono — cuando el componente vuelve al modo display después de guardar, el prop `lead` todavía tiene el valor viejo. Usar estado local para actualizar la UI inmediatamente.

```typescript
// ✅ Patrón correcto: estado local + router.refresh() opcional
const [displayValue, setDisplayValue] = useState(initialValue)

async function saveField() {
  const res = await fetch(...)
  if (res.ok) {
    setDisplayValue(newValue)   // actualiza inmediatamente
    setEditing(false)
    router.refresh()             // sincroniza con el servidor eventualmente
  }
}
```

## Patrón crítico — `formatDate` con strings de fecha sin hora (YYYY-MM-DD)

`new Date("2026-06-10")` crea medianoche UTC. En Chile (UTC-3/UTC-4) esto se muestra como el día anterior. La función `formatDate` en `src/lib/utils.ts` ya maneja este caso: si el string es exactamente `YYYY-MM-DD`, lo parsea como fecha local usando `new Date(year, month-1, day)` para evitar el desfase.

```typescript
// ✅ formatDate ya corregido — no hacer conversión manual antes de llamarlo
formatDate("2026-06-10") // → "10 jun. 2026" (correcto en cualquier timezone)

// ❌ NO hacer esto antes de pasar una fecha a la API
new Date(form.due_date).toISOString() // convierte a UTC → llega un día antes al servidor
// ✅ Enviar el string YYYY-MM-DD directamente — la columna `date` de Postgres lo acepta tal cual
body: JSON.stringify({ due_date: form.due_date || null })
```

Esta regla aplica a `tasks.due_date`, `agency_tasks.due_date`, y cualquier otra columna de tipo `date` (no `timestamptz`).

## Patrón crítico — createClient() en componentes "use client"

Next.js SSR ejecuta componentes `"use client"` en el servidor durante el build. Si `createClient()` (browser Supabase) se llama al nivel del componente, falla en Vercel porque las env vars no están disponibles en build time.

```typescript
// ❌ ROMPE el build en Vercel
export function LoginForm() {
  const supabase = createClient() // se ejecuta en SSR → crash
}

// ✅ Correcto: solo dentro de handlers/effects (browser únicamente)
export function LoginForm() {
  async function handleSubmit() {
    const supabase = createClient() // solo corre en el browser
  }
}
```
Archivos afectados y corregidos: `LoginForm.tsx`, `AdminSidebar.tsx`, `DashboardSidebar.tsx`, `activar-cuenta/page.tsx`

## Módulo /admin/clients — Clientes de la agencia

El módulo muestra la tabla `companies` (no leads cerrados — eso era el diseño anterior).

### Flujos de creación de cliente
1. **Directo** desde `/admin/clients` → botón "Nuevo cliente" → `NewClientModal`
2. **Conversión** desde detalle de agency_lead en etapa `is_final=true` → banner verde con `ConvertToClientButton` → mismo `NewClientModal` con datos prellenados del lead

### Componentes
- `ClientsListClient` (`src/components/clients/`) — tabla con buscador en memoria
- `NewClientModal` — Dialog con 2 secciones: datos empresa + usuario admin (obligatorio)
- `ClientActivitiesPanel` — historial + formulario inline de actividades
- `ConvertToClientButton` — botón + modal prefillado desde agency_lead

### API routes (todas requieren super_admin, createAdminClient())
```
GET    /api/admin/clients                                    → lista companies
POST   /api/admin/clients                                    → crear company + generateInviteLink + sendInvitationEmail
GET    /api/admin/clients/[companyId]/activities             → lista actividades de la empresa
POST   /api/admin/clients/[companyId]/activities             → crear actividad { type, title, description, activity_date }
DELETE /api/admin/clients/[companyId]/activities/[activityId] → eliminar (verifica company_id anti-IDOR)
```

### Ficha de cliente (`/admin/clients/[companyId]`)
Header con nombre, StatusBadge, fee mensual, y botones de acceso rápido:
- Pipeline → `/admin/companies/[id]/leads`
- Equipo → `/admin/companies/[id]/team`
- Usuarios → `/admin/companies/[id]/users`
- Editar empresa → `/admin/companies/[id]/edit`

## Migraciones aplicadas
| # | Descripción |
|---|-------------|
| 001 | Schema inicial |
| 002 | Tablas agencia |
| 003 | Template email bienvenida |
| 004 | agency_leads completo |
| 005 | Template email invitación |
| 006 | task_comments |
| 007 | scheduled_at en leads y agency_leads |
| 008 | custom_lead_fields + custom_lead_field_values + user_lead_column_preferences |
| 009 | notifications |
| 010 | Google Calendar: tasks.due_date y agency_tasks.due_date a TIMESTAMPTZ, tabla user_google_calendar_tokens, columna google_calendar_event_id en ambas tablas de tareas |
| 011 | agency_client_activities — historial de actividades por empresa cliente |
| 014 | agency_member role — CHECK constraint, is_agency_staff(), políticas RLS actualizadas |

## Sistema de notificaciones in-app

### TopBar
- Componente servidor en `src/components/shared/TopBar.tsx` — recibe `userName: string`
- Renderiza: nombre del usuario (con ícono), botón cerrar sesión, `<NotificationBell />`
- Integrado en `src/app/admin/layout.tsx` y `src/app/dashboard/layout.tsx` — ambos pasan `profile.full_name`

### NotificationBell
- `src/components/shared/NotificationBell.tsx` — componente client
- Hace polling a `GET /api/notifications` cada 60 segundos
- Badge rojo con contador de no-leídas (máx. "99+")
- Dropdown con últimas 20 notificaciones: click en una no-leída → marca como leída (PATCH individual)
- Botón "Marcar todas como leídas" → `PATCH /api/notifications/read-all`
- Cierra al hacer click fuera (ref + `mousedown` listener)
- **Colores**: no-leída → `bg-slate-50` + texto `text-slate-800 font-medium` + ícono `text-indigo-500` + dot azul; leída → `bg-white` + texto `text-slate-400` + ícono `text-slate-300`

### APIs
```
GET  /api/notifications            → últimas 20 del usuario autenticado, orden desc
PATCH /api/notifications/[id]/read → marca una notificación como leída (solo la propia)
PATCH /api/notifications/read-all  → marca todas las no-leídas del usuario
```
- Todas usan `createClient()` + `getProfile()` — la RLS de Supabase refuerza que solo el dueño accede

### Cuándo se crean notificaciones
Las notificaciones se insertan via `createAdminClient()` (bypasea RLS) en los siguientes endpoints, condición: `assigned_to` existe y es distinto al usuario que realiza la acción:

| Endpoint | Tipo | Cuándo |
|----------|------|--------|
| `POST /api/tasks` | `task_assigned` | Nueva tarea con responsable |
| `PATCH /api/tasks/[id]` | `task_assigned` | Cambio de responsable |
| `POST /api/leads/[id]/tasks` | `task_assigned` | Tarea desde detalle de lead |
| `POST /api/admin/agency/tasks` | `task_assigned` | Nueva tarea de agencia |
| `PATCH /api/admin/agency/tasks/[id]` | `task_assigned` | Cambio de responsable (agencia) |
| `POST /api/admin/agency/leads/[id]/tasks` | `task_assigned` | Tarea desde lead de agencia |

### Cron de vencimiento diario
- Ruta: `POST /api/cron/task-due-notifications`
- Autorización: header `Authorization: Bearer ${CRON_SECRET}` (variable de entorno en Vercel)
- Configurado en `vercel.json` → schedule `"0 9 * * *"` (9:00 AM UTC = 6:00 AM Chile)
- Recorre `tasks` y `agency_tasks` con `due_date = hoy` y `status != completed` y `assigned_to != null`
- Inserta notificación `task_due` solo si no existe una igual en las últimas 24 h (dedup)
- `CRON_SECRET` debe agregarse en Vercel → Settings → Environment Variables

## Integración Google Calendar

### Propósito
Cada usuario puede conectar su propia cuenta de Google Calendar. Al crear una tarea desde el detalle de un lead, si el usuario tiene Calendar conectado aparece un checkbox para sincronizar. El evento se crea en el calendario del asignado (o del creador si no hay asignado).

### Variables de entorno requeridas
- `GOOGLE_CLIENT_ID` — Client ID de Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — Client Secret de Google Cloud Console
- `NEXT_PUBLIC_SITE_URL` — URL base del sitio (ya existía, usada para redirect URI)

### Tabla BD
`user_google_calendar_tokens` — una fila por usuario, con RLS (solo el dueño lee/escribe su registro):
```
id, user_id(FK→auth.users CASCADE), access_token, refresh_token, token_expiry, calendar_id, calendar_name, google_email, connected_at, updated_at
```

### Columnas agregadas a tareas
- `tasks.google_calendar_event_id TEXT NULL`
- `agency_tasks.google_calendar_event_id TEXT NULL`

### `tasks.due_date` y `agency_tasks.due_date`
Convertidos de `DATE` a `TIMESTAMPTZ` en migración 010. Todos los formularios ahora usan `datetime-local` y envían `.toISOString()` a la API. El display usa `formatScheduledAt()` (no `formatDate()`).

### Helper interno `src/lib/google-calendar.ts`
```typescript
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent, getValidAccessToken } from "@/lib/google-calendar"
```
- `getValidAccessToken(userId)` — refresca automáticamente si está a < 5 min de expirar
- `createCalendarEvent(userId, event)` — usa el `calendar_id` guardado del usuario
- `deleteCalendarEvent(userId, eventId)` — 404 se trata como éxito
- `updateCalendarEvent(userId, eventId, patch)` — PATCH parcial al evento

### Rutas OAuth
```
GET    /api/auth/google-calendar/connect              → inicia OAuth (redirige a Google)
GET    /api/auth/google-calendar/callback             → recibe code, guarda tokens, redirige a ?calendar=conectado
DELETE /api/auth/google-calendar/disconnect           → elimina token + revoca con Google
GET    /api/auth/google-calendar/calendars            → lista calendarios del usuario
PATCH  /api/auth/google-calendar/calendars            → guarda calendar_id + calendar_name seleccionado
GET    /api/auth/google-calendar/status?userId=[id]   → { connected, calendarId, calendarName, email }
```
Seguridad OAuth: nonce en cookie `gcal_oauth_state` (HttpOnly, SameSite=Lax) + `returnTo` codificado — validado en callback antes de procesar el code.

### Redirects configurados en Google Cloud Console
- `https://crm30-git-dev-rodrigo-altoalcance.vercel.app/api/auth/google-calendar/callback`
- `https://crm30-rodrigo-altoalcance.vercel.app/api/auth/google-calendar/callback`

### UI de configuración personal
Componente `GoogleCalendarCard` (`src/components/settings/GoogleCalendarCard.tsx`) — aparece en:
- `/dashboard/settings/integrations` (sección "Mis integraciones")
- `/admin/settings/integrations` (sección "Mis integraciones personales")

### Flujo de sincronización al crear tarea
1. `LeadTasksPanel` muestra checkbox si el creador tiene Calendar conectado
2. Si el asignado es distinto al creador, llama a `status?userId=` para verificar si tiene Calendar
3. Si el asignado no tiene Calendar → warning inline, igual se puede guardar
4. Al guardar: API llama a `createCalendarEvent` en el usuario objetivo (asignado o creador)
5. Si Google falla → tarea se crea igual, respuesta incluye `_calendarSyncFailed: true` → toast warning en UI
6. `google_calendar_event_id` se guarda en la tarea

### Flujo al completar / eliminar tarea
- **Completada**: `PATCH /api/tasks/[id]` llama a `updateCalendarEvent` con `summary: "✓ Completada: [título]"` (best effort, no bloquea)
- **Eliminada**: `DELETE /api/tasks/[id]` llama a `deleteCalendarEvent` (best effort, no bloquea)
- Aplica igual en ambos contextos (empresa y agencia)

### Patrón crítico — `due_date` ahora es TIMESTAMPTZ
```typescript
// ✅ Siempre convertir a ISO antes de enviar a la API
due_date: form.due_date ? new Date(form.due_date).toISOString() : null

// ✅ Siempre mostrar con formatScheduledAt() (no formatDate())
formatScheduledAt(task.due_date) // → "15/06/2025 09:00"

// ✅ Inicializar datetime-local desde TIMESTAMPTZ
const d = new Date(isoString)
const pad = (n) => String(n).padStart(2, "0")
`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
```

## Dashboard admin — widgets de analítica

Ambos widgets son visibles para `super_admin` y `agency_member` (no contienen datos financieros).
Ubicados en `src/app/admin/page.tsx` debajo de las secciones de pagos, en grid `xl:grid-cols-2`.
Ambos tienen selector de período **7 / 15 / 30 días** con fetch client-side (sin recarga de página).
`recharts` agregado como dependencia del proyecto para estos widgets.

### Widget 1 — Gráfico de leads por cliente (`LeadsByCompanyChart`)
- Componente: `src/components/admin/LeadsByCompanyChart.tsx` — `"use client"`
- API: `GET /api/admin/dashboard/leads-by-company?days=N`
- BarChart apilado de recharts: indigo = leads abiertos (`is_final=false`), emerald = leads cerrados (`is_final=true`)
- Tooltip muestra nombre empresa, abiertos, cerrados y total
- Empresas sin leads en el período no aparecen en el gráfico

### Widget 2 — Ranking de actividad (`ActivityRankingWidget`)
- Componente: `src/components/admin/ActivityRankingWidget.tsx` — `"use client"`
- API: `GET /api/admin/dashboard/activity-ranking?days=N`
- Top 10 empresas por actividad total en el período seleccionado
- **Qué cuenta**: son acciones de la agencia, no del cliente
  - **"en leads"** → eventos en `lead_activities` de los leads de esa empresa (cambios de etapa, notas, comentarios, tareas completadas, etc.)
  - **"en cuenta"** → actividades manuales en `agency_client_activities` para esa empresa (reuniones, llamadas, notas de cuenta desde `/admin/clients/[id]`)
- Cada fila: posición, nombre, StatusBadge, barra de progreso proporcional al máximo, total + desglose
- Si `agency_client_activities` no existe aún, la API maneja el error gracefully y cuenta solo `lead_activities`

## Franja de aviso de pago (`BillingAlertBanner`)

Franja informativa descartable en la parte superior de `/dashboard/*` que advierte a los usuarios empresa cuando su pago está por vencer o ya venció.

### Lógica de negocio
- Fuente de datos: `companies.next_payment_date` (DATE, gestionada por super_admin via pagos)
- Helper compartido: `src/lib/billing.ts` — `computeBillingStatus(nextPaymentDate)` → `{ status, fecha_vencimiento }`
- Timezone de cálculo: **America/Santiago** (via `Intl.DateTimeFormat`)
- `dias_restantes == 1` → `status: "yellow"` ("Tu pago vence mañana, DD/MM/YYYY")
- `dias_restantes <= 0` → `status: "red"` ("Tu pago vence hoy" / "Tu pago está vencido desde el DD/MM/YYYY")
- `dias_restantes > 1` o `next_payment_date null` → `status: null` (sin franja)
- Nunca muestra `monthly_fee` ni `currency`

### Endpoint
```
GET /api/dashboard/billing-status
```
- Auth: sesión Supabase — `company_id` derivado de `profile.company_id` o cookie `impersonated_company`
- Devuelve solo `{ status: 'yellow' | 'red' | null, fecha_vencimiento: string | null }`
- No expone datos financieros

### Componentes y archivos
| Archivo | Rol |
|---------|-----|
| `src/lib/billing.ts` | Helper `computeBillingStatus()` — usado por layout y endpoint |
| `src/app/api/dashboard/billing-status/route.ts` | Endpoint dedicado |
| `src/components/dashboard/BillingAlertBanner.tsx` | Franja visual, `"use client"` |
| `src/app/dashboard/layout.tsx` | Calcula status server-side y pasa props |
| `src/components/dashboard/DashboardShell.tsx` | Renderiza el banner entre ImpersonationBanner y TopBar |

### Comportamiento de dismiss
- Guardado en `localStorage` con clave `billing_alert_${userId}`
- Valor: `{ date: "YYYY-MM-DD", status: "yellow" | "red" }` — fecha en zona Santiago
- Expira automáticamente al cambiar de día (se compara con hoy en Santiago al montar)
- Si el estado escala de "yellow" a "red" el mismo día, reaparece aunque ya se haya cerrado
- El dismiss es por usuario/navegador — no persiste entre dispositivos (aceptable)

### Desaparece automáticamente
Cuando el super_admin registra un pago en `/api/admin/companies/[id]/payments`, `next_payment_date` avanza al próximo ciclo. En el siguiente render del layout de dashboard, `computeBillingStatus` devuelve `null` y la franja deja de mostrarse para todos los usuarios.

## Convenciones UI
- Sidebar oscuro (`#0F172A`), accent `#6366F1` (indigo-500), fondo `#F8FAFC`
- Toasts: `toast.success/error()` de sonner
- Formularios: `react-hook-form` + `zod`
- Idioma: **español** en toda la UI
