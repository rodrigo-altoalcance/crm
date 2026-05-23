@AGENTS.md

# Alto Alcance CRM — Contexto del proyecto

## Stack
- **Next.js 16.2.6** App Router + React 19 — `params` y `cookies()` son async (siempre `await`)
- **Supabase** (PostgreSQL + Auth + RLS) — proyecto `gjpixwdfxglekkkapklt`
- **Tailwind CSS v4** + shadcn/ui manual (sin CLI de red)
- **@supabase/ssr 0.10.3** — cliente server en `src/lib/supabase/server.ts`, browser en `client.ts`
- **Resend 6.x** para emails, **Sonner** para toasts, **@hello-pangea/dnd** para Kanban
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
│   │   └── settings/emails/    # Templates de cobranza (Resend)
│   ├── dashboard/              # Portal empresa
│   │   ├── leads/              # Kanban + tabla + detalle
│   │   ├── clients/            # Clientes convertidos + registros
│   │   ├── tasks/              # Tareas
│   │   ├── team/               # Equipo + permisos
│   │   └── settings/           # Etapas, Org, Integraciones, Campos
│   └── api/
│       ├── admin/              # companies, leads, clients, impersonate, email-templates
│       ├── leads/[id]/         # stage, activities, tasks
│       ├── webhook/leads/[token]/  # Público — Make.com
│       ├── team/, tasks/, stages/
│       └── settings/           # tokens, field-definitions, organization
├── components/
│   ├── ui/                     # shadcn manual: button, card, dialog, etc.
│   ├── admin/                  # CompanyForm, ClientPaymentPanel, etc.
│   ├── leads/                  # LeadsKanban, LeadDetailPanel, CloseLeadConfirmDialog
│   ├── dashboard/              # DashboardSidebar, ImpersonationBanner
│   ├── clients/                # ClientsTable, ClientRecordsPanel
│   ├── tasks/, team/, settings/
│   └── shared/                 # EmptyState, ConfirmDialog, StatusBadge, PriorityBadge
└── lib/
    ├── supabase/{client,server,admin,middleware}.ts
    ├── auth/{getProfile,roles}.ts
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
email_templates    id, name, subject, body_html, is_default
crm_settings       key, value  (agency_name, agency_email, resend_api_key)
```

## Permisos sellers (profiles.permissions jsonb)
```json
{"can_view_all_leads": true, "can_create_leads": true, "can_edit_leads": true,
 "can_delete_leads": false, "can_close_leads": true, "can_view_reports": true, "can_manage_stages": false}
```

## Flujos especiales
- **Cierre de lead**: etapa con `is_final=true` → aparece automáticamente en módulo Clientes
- **Impersonación**: `POST /api/admin/impersonate` → cookie `impersonated_company` → super_admin ve el portal de la empresa
- **Webhook Make.com**: `POST /api/webhook/leads/[token]` (público) → mapea campos via `field_mapping` del token
- **Pagos**: solo super_admin puede ver/crear pagos — RLS lo bloquea para otros roles

## Convenciones UI
- Sidebar oscuro (`#0F172A`), accent `#6366F1` (indigo-500), fondo `#F8FAFC`
- Toasts: `toast.success/error()` de sonner
- Formularios: `react-hook-form` + `zod`
- Idioma: **español** en toda la UI
