import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { FieldsEditor } from "@/components/settings/FieldsEditor"

export default async function FieldsSettingsPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  if (profile.role === "seller") redirect("/dashboard/settings/stages")

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) redirect("/login")

  const { data: fields } = await supabase
    .from("lead_field_definitions")
    .select("*")
    .eq("company_id", companyId)
    .order("position")

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Campos personalizados</h2>
        <p className="text-sm text-slate-500 mt-1">
          Define campos adicionales que aparecerán en tus leads. Úsalos también para mapear campos del webhook.
        </p>
      </div>
      <FieldsEditor fields={fields || []} />
    </div>
  )
}
