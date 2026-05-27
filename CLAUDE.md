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
│   │   ├── leads/              # Leads globales de la agencia
│   │   ├── clients/            # Leads cerrados + config de pagos
│   │   └── settings/emails/    # Templates: bienvenida + invitación + cobranza (Resend)
│   ├── dashboard/              # Portal empresa
│   │   ├── leads/              # Kanban + tabla + detalle
│   │   ├── clients/            # Clientes convertidos + registros
│   │   ├── tasks/              # Tareas
│   │   ├── team/               # Equipo + permisos
│   │   └── settings/           # Etapas, Org, Integraciones, Campos
│   └── api/
│       ├── admin/              # companies, leads, clients, impersonate, email-templates
│       │   ├── companies/[companyId]/tokens/  # CRUD tokens webhook (super_admin, sin impersonar)
│       │   ├── companies/[companyId]/leads/   # CRUD leads empresa (admin directo, sin impersonar)
│       │   │   └── [leadId]/{stage,activities,tasks}/
│       │   └── companies/[companyId]/team/    # Invitar/gestionar equipo empresa (admin directo)
│       │       └── [userId]/                  # PATCH permisos, DELETE miembro
│       ├── leads/[id]/         # stage, activities, tasks
│       ├── webhook/leads/[token]/  # Público — Make.com
│       ├── team/, tasks/, stages/
│       ├── admin/test-email/   # POST — prueba de envío (solo super_admin)
       └── settings/           # tokens, field-definitions, organization
├── components/
│   ├── ui/                     # shadcn manual: button, card, dialog, etc.
│   ├── admin/                  # CompanyForm, ClientPaymentPanel, AdminSidebar, InviteUserForm, etc.
│   ├── leads/                  # LeadsKanban, LeadDetailPanel, CloseLeadConfirmDialog
│   ├── dashboard/              # DashboardSidebar, ImpersonationBanner
│   ├── clients/                # ClientsTable, ClientRecordsPanel
│   ├── tasks/, team/           # TeamView acepta apiPrefix + permissionsBasePath
│   ├── settings/               # WebhookConfig, FieldMappingEditor, StagesEditor, OrganizationForm, FieldsEditor
│   └── shared/                 # EmptyState, ConfirmDialog, StatusBadge, PriorityBadge
└── lib/
    ├── supabase/{client,server,admin,middleware}.ts
    ├── auth/{getProfile,roles}.ts
    ├── email/mailer.ts         # sendEmail({ to, subject, html }) — usa RESEND_API_KEY
    ├── email/welcome.ts        # sendWelcomeEmail({ to, companyName, verificationLink }) — usa template de BD
    ├── email/invitation.ts     # sendInvitationEmail({ to, inviteeName, companyName, inviteLink }) — usa template BD
    └── utils.ts                # cn(), formatCLP(), formatDate()
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
companies          id, name, monthly_fee, currency, payment_day, max_users, status, org_*
profiles           id(=auth.uid), company_id, role, full_name, permissions(jsonb)
leads              id, company_id, stage_id, first_name, last_name, email, phone, source, custom_fields(jsonb)
lead_stages        id, company_id, name, color, position, is_final, is_lost
lead_activities    id, lead_id, user_id, type, description, metadata(jsonb)
tasks              id, company_id, lead_id, title, priority, status, assigned_to, due_date
webhook_tokens     id, company_id, token(uuid), name, field_mapping(jsonb)
lead_field_definitions  id, company_id, name, label, type, options(jsonb), position
client_records     id, lead_id, company_id, title, description, type, record_date
payments           id, company_id, amount, currency, paid_at (super_admin only)
email_templates    id, name, subject, body_html, type('billing'|'welcome'|'invitation'), is_default
crm_settings       key, value  (agency_name, agency_email)  — resend_api_key ya NO se guarda aquí, va en env var
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
| `super_admin` | `/admin/companies/[id]/integrations` | `/api/admin/companies/[companyId]/tokens` (sin cookie, `createAdminClient`) |

### Componentes reutilizables
- `WebhookConfig` acepta prop `apiPrefix` (default `/api/settings`) — úsalo para apuntar a distinto backend
- `FieldMappingEditor` acepta prop `apiPrefix` igual — propagar siempre desde `WebhookConfig`

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

## Convenciones UI
- Sidebar oscuro (`#0F172A`), accent `#6366F1` (indigo-500), fondo `#F8FAFC`
- Toasts: `toast.success/error()` de sonner
- Formularios: `react-hook-form` + `zod`
- Idioma: **español** en toda la UI
