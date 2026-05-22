import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TasksView } from "@/components/tasks/TasksView"
import { canViewAllLeads } from "@/lib/auth/roles"

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
    .select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url), lead:leads(id, first_name, last_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  // Sellers without can_view_all_leads only see their own tasks
  const viewAll = canViewAllLeads(profile)
  if (profile.role === "seller" && !viewAll) {
    query = query.eq("assigned_to", profile.id)
  }

  const { data: tasks } = await query

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tareas</h1>
        <p className="text-sm text-slate-500 mt-1">{tasks?.length || 0} tarea{(tasks?.length || 0) !== 1 ? "s" : ""} en total</p>
      </div>

      <TasksView
        tasks={tasks || []}
        teamMembers={teamMembers || []}
        companyId={companyId}
      />
    </div>
  )
}
