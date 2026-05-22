import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { StagesEditor } from "@/components/settings/StagesEditor"

export default async function StagesSettingsPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) redirect("/login")

  if (profile.role === "seller" && !profile.permissions?.can_manage_stages) {
    redirect("/dashboard/settings/organization")
  }

  const { data: stages } = await supabase
    .from("lead_stages")
    .select("*")
    .eq("company_id", companyId)
    .order("position")

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Etapas del pipeline</h2>
        <p className="text-sm text-slate-500 mt-1">
          Arrastra para reordenar. Las etapas finales marcan leads como clientes ganados.
        </p>
      </div>
      <StagesEditor initialStages={stages || []} />
    </div>
  )
}
