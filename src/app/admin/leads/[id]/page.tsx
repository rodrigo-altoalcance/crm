import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel"
import { LeadTasksPanel } from "@/components/leads/LeadTasksPanel"
import { LeadHistoryPanel } from "@/components/leads/LeadHistoryPanel"
import type { Lead, LeadStage, Task } from "@/types/database"

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()
  const [
    { data: agencyLead },
    { data: agencyActivities },
    { data: agencyTasks },
    { data: agencyStages },
    { data: teamMembers },
  ] = await Promise.all([
    admin
      .from("agency_leads")
      .select("*, stage:agency_stages(*), assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
      .eq("id", id)
      .single(),
    admin
      .from("agency_lead_activities")
      .select("*, profile:profiles(full_name, avatar_url)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("agency_tasks")
      .select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    admin.from("agency_stages").select("*").order("position"),
    supabase.from("profiles").select("id, full_name, avatar_url").eq("role", "super_admin"),
  ])

  if (!agencyLead) notFound()

  const lead: Lead = {
    id: agencyLead.id,
    company_id: "agency",
    stage_id: agencyLead.stage_id ?? "",
    first_name: agencyLead.first_name ?? "",
    last_name: agencyLead.last_name ?? "",
    email: agencyLead.email ?? "",
    phone: agencyLead.phone ?? null,
    message: agencyLead.message ?? null,
    source: (agencyLead.source as Lead["source"]) ?? "manual",
    assigned_to: agencyLead.assigned_to ?? null,
    notes: null,
    custom_fields: agencyLead.custom_fields ?? {},
    created_at: agencyLead.created_at,
    updated_at: agencyLead.updated_at ?? agencyLead.created_at,
    stage: agencyLead.stage ? { ...agencyLead.stage, company_id: "agency" } : undefined,
    assigned_profile: agencyLead.assigned_profile ?? undefined,
  }

  const stages: LeadStage[] = (agencyStages || []).map((s) => ({ ...s, company_id: "agency" }))

  const tasks: Task[] = (agencyTasks || []).map((t) => ({
    id: t.id,
    company_id: "agency",
    lead_id: t.lead_id,
    title: t.title,
    description: t.description ?? null,
    assigned_to: t.assigned_to ?? null,
    due_date: t.due_date ?? null,
    priority: t.priority,
    status: t.status,
    created_by: t.created_by ?? profile.id,
    created_at: t.created_at,
    assigned_profile: t.assigned_profile ?? undefined,
  }))

  return (
    <div className="p-8">
      <Link href="/admin/leads" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver a Leads
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <LeadDetailPanel
            lead={lead}
            stages={stages}
            teamMembers={teamMembers || []}
            profile={profile}
            apiPrefix="/api/admin/agency"
            closedRedirectPath="/admin/leads"
          />
        </div>

        <div className="space-y-6">
          <LeadTasksPanel
            leadId={id}
            tasks={tasks}
            teamMembers={teamMembers || []}
            apiPrefix="/api/admin/agency"
            taskApiPrefix="/api/admin/agency"
            canEdit={true}
          />
          <LeadHistoryPanel activities={(agencyActivities || []) as any} />
        </div>
      </div>
    </div>
  )
}
