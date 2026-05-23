import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { redirect } from "next/navigation"
import { WebhookConfig } from "@/components/settings/WebhookConfig"
import type { WebhookToken } from "@/types/database"

export default async function AgencyIntegrationsPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()
  const { data: tokens } = await admin
    .from("agency_webhook_tokens")
    .select("*")
    .order("created_at")

  // Map agency tokens to WebhookToken shape (company_id not used by WebhookConfig)
  const tokensMapped: WebhookToken[] = (tokens || []).map((t) => ({
    ...t,
    company_id: "agency",
  }))

  const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || ""

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Integraciones</h1>
        <p className="text-sm text-slate-500 mt-1">
          Webhooks exclusivos de la agencia. Completamente separados de los webhooks de los clientes.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Webhooks de Make.com</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tokens para recibir leads automáticamente. Mapea los campos que envía Make hacia el CRM.
        </p>
      </div>

      <WebhookConfig
        tokens={tokensMapped}
        webhookBaseUrl={webhookBaseUrl}
        apiPrefix="/api/admin/agency"
        webhookPath="/api/webhook/agency/"
      />
    </div>
  )
}
