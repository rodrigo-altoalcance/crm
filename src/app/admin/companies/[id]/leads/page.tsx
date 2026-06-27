import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { isAgencyStaff } from "@/lib/auth/roles"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LeadsView } from "@/components/leads/LeadsView"
import { ArrowLeft, Plus } from "lucide-react"
import type { Lead, LeadStage } from "@/types/database"

export default async function AdminCompanyLeadsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || !isAgencyStaff(profile)) redirect("/login")

  const admin = createAdminClient()

  const [{ data: company }, { data: stages }, { data: leads }, { data: teamMembers }, { data: customFields }, { data: columnPrefsRows }] =
    await Promise.all([
      admin.from("companies").select("id, name").eq("id", id).single(),
      admin.from("lead_stages").select("*").eq("company_id", id).order("position"),
      admin
        .from("leads")
        .select("*, stage:lead_stages(*), assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
        .eq("company_id", id)
        .order("created_at", { ascending: false }),
      admin.from("profiles").select("id, full_name, avatar_url, role").eq("company_id", id),
      admin.from("custom_lead_fields").select("*").eq("context", "company").eq("company_id", id).order("orden"),
      supabase.from("user_lead_column_preferences").select("column_key, visible").eq("user_id", profile.id).eq("context", "company").eq("company_id", id),
    ])

  if (!company) notFound()

  const mappedStages: LeadStage[] = (stages || []).map((s) => ({ ...s }))
  const mappedLeads: Lead[] = (leads || []).map((l) => ({ ...l })) as Lead[]

  const initialColumnPrefs: Record<string, boolean> = {}
  for (const row of columnPrefsRows || []) initialColumnPrefs[row.column_key] = row.visible

  const leadIds = mappedLeads.map((l) => l.id)
  let fieldValuesMap: Record<string, Record<string, string>> = {}
  if (leadIds.length > 0 && (customFields || []).length > 0) {
    const { data: allValues } = await admin
      .from("custom_lead_field_values")
      .select("lead_id, field_id, valor")
      .in("lead_id", leadIds)
    for (const v of allValues || []) {
      if (!fieldValuesMap[v.lead_id]) fieldValuesMap[v.lead_id] = {}
      fieldValuesMap[v.lead_id][v.field_id] = v.valor ?? ""
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/admin/companies/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a {company.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pipeline — {company.name}</h1>
            <p className="text-sm text-slate-500 mt-1">{mappedLeads.length} leads en total</p>
          </div>
          <Button asChild>
            <Link href={`/admin/companies/${id}/leads/new`}>
              <Plus className="w-4 h-4" /> Nuevo lead
            </Link>
          </Button>
        </div>
      </div>

      <LeadsView
        leads={mappedLeads}
        stages={mappedStages}
        teamMembers={teamMembers || []}
        profile={profile}
        companyId={id}
        basePath={`/admin/companies/${id}/leads`}
        apiPrefix={`/api/admin/companies/${id}`}
        customFields={customFields || []}
        initialColumnPrefs={initialColumnPrefs}
        fieldValuesMap={fieldValuesMap}
        columnPrefsApiPrefix={`/api/admin/companies/${id}`}
      />
    </div>
  )
}
