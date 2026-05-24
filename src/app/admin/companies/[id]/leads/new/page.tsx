import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { NewLeadForm } from "@/components/leads/NewLeadForm"
import type { LeadStage } from "@/types/database"

export default async function AdminCompanyNewLeadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()
  const [{ data: company }, { data: stages }, { data: teamMembers }] = await Promise.all([
    admin.from("companies").select("id, name").eq("id", id).single(),
    admin.from("lead_stages").select("*").eq("company_id", id).order("position"),
    admin.from("profiles").select("*").eq("company_id", id),
  ])

  if (!company) notFound()

  const mappedStages: LeadStage[] = (stages || []).map((s) => ({ ...s }))

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/admin/companies/${id}/leads`}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al pipeline
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo lead</h1>
        <p className="text-sm text-slate-500 mt-1">{company.name}</p>
      </div>

      <NewLeadForm
        stages={mappedStages}
        teamMembers={teamMembers || []}
        redirectPath={`/admin/companies/${id}/leads`}
        apiPath={`/api/admin/companies/${id}/leads`}
      />
    </div>
  )
}
