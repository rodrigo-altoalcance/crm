import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { isAgencyStaff } from "@/lib/auth/roles"
import { redirect } from "next/navigation"
import { TasksView } from "@/components/tasks/TasksView"
import type { Task } from "@/types/database"

export default async function AdminTasksPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || !isAgencyStaff(profile)) redirect("/login")

  const admin = createAdminClient()

  const [{ data: rawTasks }, { data: teamMembers }] = await Promise.all([
    admin
      .from("agency_tasks")
      .select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url), lead:agency_leads(id, first_name, last_name, phone, email)")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, avatar_url, role, permissions, phone, company_id, created_at").in("role", ["super_admin", "agency_member"]),
  ])

  // Load last comment per lead
  const leadIds = (rawTasks || []).filter((t) => t.lead_id).map((t) => t.lead_id as string)
  const lastCommentMap: Record<string, string> = {}
  if (leadIds.length > 0) {
    const { data: recentActivities } = await admin
      .from("agency_lead_activities")
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

  const tasks: Task[] = (rawTasks || []).map((t) => ({
    id: t.id,
    company_id: "agency",
    lead_id: t.lead_id ?? null,
    title: t.title,
    description: t.description ?? null,
    assigned_to: t.assigned_to ?? null,
    due_date: t.due_date ?? null,
    priority: t.priority,
    status: t.status,
    created_by: t.created_by ?? profile.id,
    created_at: t.created_at,
    assigned_profile: t.assigned_profile ?? undefined,
    lead: t.lead ? { ...(t.lead as any), last_comment: lastCommentMap[t.lead_id ?? ""] ?? null } : undefined,
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tareas de Agencia</h1>
        <p className="text-sm text-slate-500 mt-1">{tasks.length} tarea{tasks.length !== 1 ? "s" : ""} en total</p>
      </div>

      <TasksView
        tasks={tasks}
        teamMembers={teamMembers || []}
        companyId="agency"
        tasksApiPrefix="/api/admin/agency"
      />
    </div>
  )
}
