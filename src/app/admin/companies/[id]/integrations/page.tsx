import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { WebhookConfig } from "@/components/settings/WebhookConfig"
import { CustomLeadFieldsEditor } from "@/components/settings/CustomLeadFieldsEditor"

export default async function AdminCompanyIntegrationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, name")
    .eq("id", id)
    .single()

  if (!company) notFound()

  const { data: tokens } = await admin
    .from("webhook_tokens")
    .select("*")
    .eq("company_id", id)
    .order("created_at")

  const { data: customFields } = await admin
    .from("custom_lead_fields")
    .select("*")
    .eq("context", "company")
    .eq("company_id", id)
    .order("orden")

  const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || ""

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/admin/companies/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a {company.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Integraciones</h1>
        <p className="text-sm text-slate-500 mt-1">{company.name}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Webhooks de Make.com</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tokens para recibir leads automáticamente. Mapea los campos que envía Make hacia el CRM.
        </p>
      </div>

      <div className="mb-8">
        <WebhookConfig
          tokens={tokens || []}
          webhookBaseUrl={webhookBaseUrl}
          apiPrefix={`/api/admin/companies/${id}`}
        />
      </div>

      <CustomLeadFieldsEditor
        initialFields={customFields || []}
        apiPrefix={`/api/admin/companies/${id}`}
      />
    </div>
  )
}
