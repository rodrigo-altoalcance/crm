import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { isAgencyStaff } from "@/lib/auth/roles"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel"
import { LeadTasksPanel } from "@/components/leads/LeadTasksPanel"
import { LeadHistoryPanel } from "@/components/leads/LeadHistoryPanel"
import type { Lead, LeadStage, Task } from "@/types/database"

export default async function AdminCompanyLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string; leadId: string }>
}) {
  const { id: companyId, leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || !isAgencyStaff(profile)) redirect("/login")

  const admin = createAdminClient()
  const [
    { data: company },
    { data: rawLead },
    { data: activities },
    { data: rawTasks },
    { data: stages },
    { data: teamMembers },
    { data: customFields },
    { data: fieldValueRows },
  ] = await Promise.all([
    admin.from("companies").select("id, name").eq("id", companyId).single(),
    admin
      .from("leads")
      .select("*, stage:lead_stages(*), assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
      .eq("id", leadId)
      .eq("company_id", companyId)
      .single(),
    admin
      .from("lead_activities")
      .select("*, profile:profiles(full_name, avatar_url)")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
    admin
      .from("tasks")
      .select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
      .eq("lead_id", leadId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    admin.from("lead_stages").select("*").eq("company_id", companyId).order("position"),
    admin.from("profiles").select("id, full_name, avatar_url").eq("company_id", companyId),
    admin.from("custom_lead_fields").select("*").eq("context", "company").eq("company_id", companyId).order("orden"),
    admin.from("custom_lead_field_values").select("field_id, valor").eq("lead_id", leadId),
  ])

  const initialFieldValues: Record<string, string> = {}
  for (const v of fieldValueRows || []) initialFieldValues[v.field_id] = v.valor ?? ""

  if (!company) notFound()
  if (!rawLead) notFound()

  const lead = rawLead as Lead
  const mappedStages: LeadStage[] = (stages || []).map((s) => ({ ...s }))
  const tasks: Task[] = (rawTasks || []).map((t) => ({
    ...t,
    company_id: companyId,
    lead_id: t.lead_id ?? null,
    description: t.description ?? null,
    assigned_to: t.assigned_to ?? null,
    due_date: t.due_date ?? null,
    created_by: t.created_by ?? profile.id,
  }))

  const apiPrefix = `/api/admin/companies/${companyId}`

  return (
    <div className="p-8">
      <Link
        href={`/admin/companies/${companyId}/leads`}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al pipeline de {company.name}
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <LeadDetailPanel
            lead={lead}
            stages={mappedStages}
            teamMembers={teamMembers || []}
            profile={profile}
            apiPrefix={apiPrefix}
            closedRedirectPath={`/admin/companies/${companyId}/leads`}
            customFields={customFields || []}
            initialFieldValues={initialFieldValues}
          />
        </div>

        <div className="space-y-6">
          <LeadTasksPanel
            leadId={leadId}
            tasks={tasks}
            teamMembers={teamMembers || []}
            apiPrefix={apiPrefix}
            taskApiPrefix="/api"
          />
          <LeadHistoryPanel activities={activities || []} />
        </div>
      </div>
    </div>
  )
}
