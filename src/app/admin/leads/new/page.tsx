import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { NewLeadForm } from "@/components/leads/NewLeadForm"
import type { LeadStage } from "@/types/database"

export default async function AdminNewLeadPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()
  const [{ data: agencyStages }, { data: teamMembers }] = await Promise.all([
    admin.from("agency_stages").select("*").order("position"),
    supabase.from("profiles").select("id, full_name, avatar_url, role, permissions, phone, company_id, created_at").eq("role", "super_admin"),
  ])

  const stages: LeadStage[] = (agencyStages || []).map((s) => ({
    ...s,
    company_id: "agency",
  }))

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/admin/leads" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver a Leads
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo lead</h1>
        <p className="text-sm text-slate-500 mt-1">Crea un nuevo lead para la agencia.</p>
      </div>

      <NewLeadForm
        stages={stages}
        teamMembers={teamMembers || []}
        redirectPath="/admin/leads"
        apiPath="/api/admin/agency/leads"
      />
    </div>
  )
}
