import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { WebhookConfig } from "@/components/settings/WebhookConfig"
import { CustomLeadFieldsEditor } from "@/components/settings/CustomLeadFieldsEditor"

export default async function IntegrationsSettingsPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) redirect("/login")

  if (profile.role === "seller") redirect("/dashboard/settings/stages")

  const { data: tokens } = await supabase
    .from("webhook_tokens")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at")

  const { data: customFields } = await supabase
    .from("custom_lead_fields")
    .select("*")
    .eq("context", "company")
    .eq("company_id", companyId)
    .order("orden")

  const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || ""

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Integraciones y webhooks</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configura webhooks para recibir leads automáticamente desde Meta, Calendly u otros servicios.
        </p>
      </div>

      <div className="mb-8">
        <WebhookConfig tokens={tokens || []} webhookBaseUrl={webhookBaseUrl} />
      </div>

      <CustomLeadFieldsEditor
        initialFields={customFields || []}
        apiPrefix="/api/settings"
      />
    </div>
  )
}
