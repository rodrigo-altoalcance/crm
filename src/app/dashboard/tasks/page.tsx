import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TasksView } from "@/components/tasks/TasksView"

export default async function TasksPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) redirect("/login")

  const [{ data: teamMembers }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, permissions, phone, company_id, created_at")
      .eq("company_id", companyId),
  ])

  let query = supabase
    .from("tasks")
    .select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url), lead:leads(id, first_name, last_name, phone, email)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  // Sellers see only their own tasks (assigned to them or created by them)
  if (profile.role === "seller") {
    query = query.or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`)
  }

  const { data: tasks } = await query

  // Load last comment per lead
  const leadIds = (tasks || []).filter((t) => t.lead_id).map((t) => t.lead_id as string)
  const lastCommentMap: Record<string, string> = {}
  if (leadIds.length > 0) {
    const { data: recentActivities } = await supabase
      .from("lead_activities")
      .select("lead_id, description, created_at")
      .in("lead_id", leadIds)
      .in("type", ["stage_changed", "lead_closed", "note_added", "comment", "task_completed"])
      .not("description", "is", null)
      .order("created_at", { ascending: false })
    for (const act of recentActivities || []) {
      if (act.lead_id && !(act.lead_id in lastCommentMap) && act.description) {
        lastCommentMap[act.lead_id] = act.description
      }
    }
  }

  const tasksWithExtra = (tasks || []).map((t) => ({
    ...t,
    lead: t.lead ? { ...(t.lead as any), last_comment: lastCommentMap[t.lead_id!] ?? null } : t.lead,
  }))

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Mis tareas</h1>
        <p className="text-sm text-slate-500 mt-1">{tasksWithExtra.length} tarea{tasksWithExtra.length !== 1 ? "s" : ""} en total</p>
      </div>

      <TasksView
        tasks={tasksWithExtra as any}
        teamMembers={teamMembers || []}
        companyId={companyId}
        tasksApiPrefix="/api"
      />
    </div>
  )
}
