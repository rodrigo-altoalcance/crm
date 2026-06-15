import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { NewLeadForm } from "@/components/leads/NewLeadForm"

export default async function NewLeadPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) redirect("/login")

  const [{ data: stages }, { data: teamMembers }] = await Promise.all([
    supabase
      .from("lead_stages")
      .select("*")
      .eq("company_id", companyId)
      .order("position"),
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, permissions, phone, company_id, created_at")
      .eq("company_id", companyId),
  ])

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <Link
        href="/dashboard/leads"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a Leads
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo lead</h1>
        <p className="text-sm text-slate-500 mt-1">Completa los datos para crear un nuevo lead.</p>
      </div>

      <NewLeadForm stages={stages || []} teamMembers={teamMembers || []} />
    </div>
  )
}
