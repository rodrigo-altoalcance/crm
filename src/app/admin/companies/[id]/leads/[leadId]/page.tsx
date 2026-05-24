import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel"
import { LeadTasksPanel } from "@/components/leads/LeadTasksPanel"
import { LeadNoteForm } from "@/components/leads/LeadNoteForm"
import type { Lead, LeadStage, Task } from "@/types/database"

export default async function AdminCompanyLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string; leadId: string }>
}) {
  const { id: companyId, leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()
  const [
    { data: company },
    { data: rawLead },
    { data: activities },
    { data: rawTasks },
    { data: stages },
    { data: teamMembers },
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
      .select("*, assigned_profile:profiles!assigned_to(full_name)")
      .eq("lead_id", leadId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    admin.from("lead_stages").select("*").eq("company_id", companyId).order("position"),
    admin.from("profiles").select("id, full_name, avatar_url").eq("company_id", companyId),
  ])

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
        <div className="xl:col-span-2 space-y-6">
          <LeadDetailPanel
            lead={lead}
            stages={mappedStages}
            teamMembers={teamMembers || []}
            profile={profile}
            apiPrefix={apiPrefix}
            closedRedirectPath={`/admin/companies/${companyId}/leads`}
          />
          <LeadNoteForm leadId={leadId} apiPrefix={apiPrefix} />
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Actividad</h2>
            {activities && activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((act: any) => (
                  <div key={act.id} className="flex gap-3 py-2 border-b last:border-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold flex-shrink-0 mt-0.5">
                      {act.profile?.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{act.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {act.profile?.full_name} · {new Date(act.created_at).toLocaleDateString("es-CL")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sin actividad registrada</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <LeadTasksPanel
            leadId={leadId}
            tasks={tasks}
            teamMembers={teamMembers || []}
            companyId={companyId}
            apiPrefix={apiPrefix}
          />
        </div>
      </div>
    </div>
  )
}
