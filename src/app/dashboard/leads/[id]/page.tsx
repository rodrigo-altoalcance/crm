import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel"
import { LeadTasksPanel } from "@/components/leads/LeadTasksPanel"
import { LeadNoteForm } from "@/components/leads/LeadNoteForm"

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
    supabase.from("tasks").select("*, assigned_profile:profiles!assigned_to(full_name)").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("lead_stages").select("*").eq("company_id", companyId).order("position"),
    supabase.from("profiles").select("id, full_name, avatar_url").eq("company_id", companyId),
  ])

  if (!lead) notFound()

  return (
    <div className="p-8">
      <Link href="/dashboard/leads" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver a Leads
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <LeadDetailPanel lead={lead} stages={stages || []} teamMembers={teamMembers || []} profile={profile} />
          <LeadNoteForm leadId={id} />
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
          <LeadTasksPanel leadId={id} tasks={tasks || []} teamMembers={teamMembers || []} companyId={companyId} />
        </div>
      </div>
    </div>
  )
}
