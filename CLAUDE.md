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
| `super_admin` | `/admin/*` — Usuario Empresa, Leads, Clientes, Config, Emails |
| `company_admin` | `/dashboard/*` — Leads, Clientes, Equipo, Config |
| `seller` | `/dashboard/*` — según permisos en `profiles.permissions` (jsonb) |

## Estructura de rutas clave
```
src/
├── proxy.ts                    # Auth routing (Next.js 16: proxy en vez de middleware)
├── app/
│   ├── (auth)/login/           # Login público
│   ├── admin/                  # Panel super_admin
│   │   ├── companies/          # CRUD usuario empresa + pagos + usuarios + pipeline + equipo
│   │   │   └── [id]/leads/     # Pipeline (Kanban+tabla) de la empresa — acceso directo sin impersonar
│   │   │   └── [id]/team/      # Equipo de la empresa — invitar colaboradores desde admin
│   │   │   └── [id]/integrations/ # Webhooks + campos personalizados empresa
│   │   ├── leads/              # Leads globales de la agencia
│   │   ├── clients/            # Leads cerrados + config de pagos
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
│       │   ├── companies/[companyId]/custom-fields/    # CRUD campos personalizados empresa
│       │   └── companies/[companyId]/column-preferences/ # Preferencias columnas (super_admin)
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
│       ├── team/, tasks/, stages/
│       └── admin/test-email/   # POST — prueba de envío (solo super_admin)
├── components/
│   ├── ui/                     # shadcn manual: button, card, dialog, dropdown-menu, etc.
│   ├── admin/                  # CompanyForm, ClientPaymentPanel, AdminSidebar, InviteUserForm, etc.
│   ├── leads/                  # LeadsKanban, LeadDetailPanel, LeadsTable, LeadsView, CloseLeadConfirmDialog
│   ├── dashboard/              # DashboardSidebar, ImpersonationBanner
│   ├── clients/                # ClientsTable, ClientRecordsPanel
│   ├── tasks/, team/           # TeamView acepta apiPrefix + permissionsBasePath
│   ├── settings/               # WebhookConfig, FieldMappingEditor, CustomLeadFieldsEditor, StagesEditor, OrganizationForm, FieldsEditor
│   └── shared/                 # EmptyState, ConfirmDialog, StatusBadge, PriorityBadge
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
custom_lead_fields           id, context('agency'|'company'), company_id(null si agencia), nombre, tipo('texto'|'numero'|'fecha'), obligatorio, orden, created_at
custom_lead_field_values     id, field_id(FK→custom_lead_fields), lead_id(UUID sin FK), valor, created_at
user_lead_column_preferences id, user_id, context, company_id, column_key, visible, created_at
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
| 008 | custom_lead_fields + custom_lead_field_values |
| 009 | user_lead_column_preferences |

## Convenciones UI
- Sidebar oscuro (`#0F172A`), accent `#6366F1` (indigo-500), fondo `#F8FAFC`
- Toasts: `toast.success/error()` de sonner
- Formularios: `react-hook-form` + `zod`
- Idioma: **español** en toda la UI
