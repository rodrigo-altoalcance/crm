import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel"
import { LeadTasksPanel } from "@/components/leads/LeadTasksPanel"
import { LeadHistoryPanel } from "@/components/leads/LeadHistoryPanel"

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) redirect("/login")

  const [{ data: lead }, { data: activities }, { data: tasks }, { data: stages }, { data: teamMembers }] = await Promise.all([
    supabase.from("leads").select("*, stage:lead_stages(*), assigned_profile:profiles!assigned_to(id, full_name, avatar_url)").eq("id", id).single(),
    supabase.from("lead_activities").select("*, profile:profiles(full_name, avatar_url)").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url)").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("lead_stages").select("*").eq("company_id", companyId).order("position"),
    supabase.from("profiles").select("id, full_name, avatar_url").eq("company_id", companyId),
  ])

  if (!lead) notFound()

  const canEditTasks = profile.role === "super_admin" || profile.role === "company_admin" || profile.permissions?.can_edit_leads === true

  return (
    <div className="p-8">
      <Link href="/dashboard/leads" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver a Leads
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <LeadDetailPanel lead={lead} stages={stages || []} teamMembers={teamMembers || []} profile={profile} />
        </div>

        <div className="space-y-6">
          <LeadTasksPanel
            leadId={id}
            tasks={tasks || []}
            teamMembers={teamMembers || []}
            apiPrefix="/api"
            taskApiPrefix="/api"
            canEdit={canEditTasks}
          />
<LeadHistoryPanel activities={activities || []} />
        </div>
      </div>
    </div>
  )
}
