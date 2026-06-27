import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { WebhookConfig } from "@/components/settings/WebhookConfig"
import { CustomLeadFieldsEditor } from "@/components/settings/CustomLeadFieldsEditor"
import { GoogleCalendarCard } from "@/components/settings/GoogleCalendarCard"
import { CalendarDays, CheckCircle, XCircle } from "lucide-react"

const roleLabels: Record<string, string> = {
  company_admin: "Admin",
  seller: "Vendedor",
}

export default async function IntegrationsSettingsPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const isImpersonating = profile.role === "super_admin"
  const companyId = isImpersonating
    ? cookieStore.get("impersonated_company")?.value
    : profile.company_id
  if (!companyId) redirect("/login")

  if (profile.role === "seller") redirect("/dashboard/settings/stages")

  const [tokensRes, customFieldsRes] = await Promise.all([
    supabase.from("webhook_tokens").select("*").eq("company_id", companyId).order("created_at"),
    supabase.from("custom_lead_fields").select("*").eq("context", "company").eq("company_id", companyId).order("orden"),
  ])

  // Cuando el admin impersona: cargar el estado de Calendar de todos los usuarios de la empresa
  let companyCalendarUsers: { id: string; full_name: string; role: string; googleEmail: string | null; calendarName: string | null; connected: boolean }[] = []
  if (isImpersonating) {
    const admin = createAdminClient()
    const { data: companyProfiles } = await admin
      .from("profiles")
      .select("id, full_name, role")
      .eq("company_id", companyId)
      .order("full_name")

    if (companyProfiles?.length) {
      const profileIds = companyProfiles.map((p) => p.id)
      const { data: calendarTokens } = await admin
        .from("user_google_calendar_tokens")
        .select("user_id, google_email, calendar_name")
        .in("user_id", profileIds)

      const calendarMap: Record<string, { google_email: string | null; calendar_name: string | null }> = {}
      for (const t of calendarTokens || []) calendarMap[t.user_id] = t

      companyCalendarUsers = companyProfiles.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        role: p.role,
        googleEmail: calendarMap[p.id]?.google_email ?? null,
        calendarName: calendarMap[p.id]?.calendar_name ?? null,
        connected: !!calendarMap[p.id],
      }))
    }
  }

  const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const connectedCount = companyCalendarUsers.filter((u) => u.connected).length

  return (
    <div>
      {/* Sección Google Calendar */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900">Google Calendar</h2>
        <p className="text-sm text-slate-500 mt-1">
          {isImpersonating
            ? "Estado de vinculación por usuario de esta empresa."
            : "Integración personal de tu cuenta."}
        </p>

        <div className="mt-4">
          {isImpersonating ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b">
                <CalendarDays className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  {connectedCount} de {companyCalendarUsers.length} usuarios vinculados
                </span>
              </div>
              {companyCalendarUsers.length === 0 ? (
                <p className="text-sm text-slate-400 px-4 py-4">Sin usuarios en esta empresa.</p>
              ) : (
                <ul className="divide-y">
                  {companyCalendarUsers.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                      {u.connected ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {u.full_name}
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            {roleLabels[u.role] ?? u.role}
                          </span>
                        </p>
                        {u.connected ? (
                          <p className="text-xs text-slate-500">
                            {u.googleEmail ?? "Email no disponible"}
                            {u.calendarName && <> &middot; {u.calendarName}</>}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Sin vincular</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <GoogleCalendarCard returnTo="/dashboard/settings/integrations" />
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 mb-8" />

      {/* Business integrations */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Integraciones y webhooks</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configura webhooks para recibir leads automáticamente desde Meta, Calendly u otros servicios.
        </p>
      </div>

      <div className="mb-8">
        <WebhookConfig tokens={tokensRes.data || []} webhookBaseUrl={webhookBaseUrl} />
      </div>

      <CustomLeadFieldsEditor
        initialFields={customFieldsRes.data || []}
        apiPrefix="/api/settings"
      />
    </div>
  )
}
