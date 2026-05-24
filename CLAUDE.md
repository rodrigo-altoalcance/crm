@AGENTS.md

# Alto Alcance CRM — Contexto del proyecto

## Stack
- **Next.js 16.2.6** App Router + React 19 — `params` y `cookies()` son async (siempre `await`)
- **Supabase** (PostgreSQL + Auth + RLS) — proyecto `gjpixwdfxglekkkapklt`
- **Tailwind CSS v4** + shadcn/ui manual (sin CLI de red)
- **@supabase/ssr 0.10.3** — cliente server en `src/lib/supabase/server.ts`, browser en `client.ts`
- **Resend 6.x** — mailer base en `src/lib/email/mailer.ts`, remitente fijo `Alto Alcance CRM <noreply@altoalcance.cl>`, clave en `RESEND_API_KEY`
- **Sonner** para toasts, **@hello-pangea/dnd** para Kanban
- **Deploy**: Vercel (`crm30.vercel.app`) conectado a `rodrigo-altoalcance/crm` rama `main`

## Roles
| Rol | Acceso |
|-----|--------|
| `super_admin` | `/admin/*` — Empresas, Leads, Clientes, Config, Emails |
| `company_admin` | `/dashboard/*` — Leads, Clientes, Equipo, Config |
| `seller` | `/dashboard/*` — según permisos en `profiles.permissions` (jsonb) |

## Estructura de rutas clave
```
src/
├── proxy.ts                    # Auth routing (Next.js 16: proxy en vez de middleware)
├── app/
│   ├── (auth)/login/           # Login público
│   ├── admin/                  # Panel super_admin
│   │   ├── companies/          # CRUD empresas + pagos + usuarios
│   │   ├── leads/              # Leads globales
│   │   ├── clients/            # Leads cerrados + config de pagos
│   │   └── settings/emails/    # Templates de email: bienvenida + cobranza (Resend)
│   ├── dashboard/              # Portal empresa
│   │   ├── leads/              # Kanban + tabla + detalle
│   │   ├── clients/            # Clientes convertidos + registros
│   │   ├── tasks/              # Tareas
│   │   ├── team/               # Equipo + permisos
│   │   └── settings/           # Etapas, Org, Integraciones, Campos
│   └── api/
│       ├── admin/              # companies, leads, clients, impersonate, email-templates
│       │   └── companies/[companyId]/tokens/  # CRUD tokens webhook (super_admin, sin impersonar)
│       ├── leads/[id]/         # stage, activities, tasks
│       ├── webhook/leads/[token]/  # Público — Make.com
│       ├── team/, tasks/, stages/
│       ├── admin/test-email/   # POST — prueba de envío (solo super_admin)
       └── settings/           # tokens, field-definitions, organization
├── components/
│   ├── ui/                     # shadcn manual: button, card, dialog, etc.
│   ├── admin/                  # CompanyForm, ClientPaymentPanel, AdminSidebar, etc.
│   ├── leads/                  # LeadsKanban, LeadDetailPanel, CloseLeadConfirmDialog
│   ├── dashboard/              # DashboardSidebar, ImpersonationBanner
│   ├── clients/                # ClientsTable, ClientRecordsPanel
│   ├── tasks/, team/
│   ├── settings/               # WebhookConfig, FieldMappingEditor, StagesEditor, OrganizationForm, FieldsEditor
│   └── shared/                 # EmptyState, ConfirmDialog, StatusBadge, PriorityBadge
└── lib/
    ├── supabase/{client,server,admin,middleware}.ts
    ├── auth/{getProfile,roles}.ts
    ├── email/mailer.ts         # sendEmail({ to, subject, html }) — usa RESEND_API_KEY
    ├── email/welcome.ts        # sendWelcomeEmail({ to, companyName, verificationLink }) — usa template de BD
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
email_templates    id, name, subject, body_html, type('billing'|'welcome'), is_default
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
- `email_templates.type = 'welcome'` — template de bienvenida, **uno por defecto** (`is_default=true`)
- El `EmailTemplateForm` muestra variables según el tipo: billing usa `{{cliente_nombre}}` etc., welcome usa `{{nombre_empresa}}`, `{{email}}`, `{{link_verificacion}}`
- Migración inicial: `supabase/migrations/003_welcome_email_template.sql`

### Email de bienvenida al crear usuario empresa
```typescript
import { sendWelcomeEmail } from "@/lib/email/welcome"
await sendWelcomeEmail({ to, companyName, verificationLink })
```
- Se dispara en `POST /api/admin/companies/[id]/users`
- Usa `adminClient.auth.admin.generateLink({ type: 'invite', email, options: { data: {...} } })` para obtener el link de activación **sin** que Supabase envíe su email genérico
- `linkData.properties.action_link` es el `{{link_verificacion}}`
- Si el envío falla, loguea el error pero **no bloquea** la creación del usuario (try/catch)

## Flujos especiales
- **Cierre de lead**: etapa con `is_final=true` → aparece automáticamente en módulo Clientes
- **Impersonación**: `POST /api/admin/impersonate` → cookie `impersonated_company` → super_admin ve el portal de la empresa
- **Webhook Make.com**: `POST /api/webhook/leads/[token]` (público) → mapea campos via `field_mapping` del token → asigna lead a primera etapa del pipeline
- **Pagos**: solo super_admin puede ver/crear pagos — RLS lo bloquea para otros roles

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
