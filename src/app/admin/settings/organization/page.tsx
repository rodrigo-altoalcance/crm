import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { isAgencyStaff } from "@/lib/auth/roles"
import { redirect } from "next/navigation"
import { AgencyOrganizationForm } from "./AgencyOrganizationForm"

export default async function AgencyOrganizationPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || !isAgencyStaff(profile)) redirect("/login")

  const { data: settings } = await supabase.from("crm_settings").select("*")
  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Organización</h1>
        <p className="text-sm text-slate-500 mt-1">Información y branding de la agencia</p>
      </div>
      <AgencyOrganizationForm settings={settingsMap} />
    </div>
  )
}
