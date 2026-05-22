import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { OrganizationForm } from "@/components/settings/OrganizationForm"

export default async function OrganizationSettingsPage() {
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

  const { data: company } = await supabase
    .from("companies")
    .select("org_name, org_email, org_phone, org_website")
    .eq("id", companyId)
    .single()

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Información de la organización</h2>
        <p className="text-sm text-slate-500 mt-1">
          Esta información se muestra en comunicaciones con clientes.
        </p>
      </div>
      <OrganizationForm
        initialData={{
          org_name: company?.org_name || "",
          org_email: company?.org_email || "",
          org_phone: company?.org_phone || "",
          org_website: company?.org_website || "",
        }}
      />
    </div>
  )
}
