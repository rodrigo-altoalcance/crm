import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { StatCard } from "@/components/admin/StatCard"
import { formatDate } from "@/lib/utils"
import { Zap, CheckSquare, Users, TrendingUp } from "lucide-react"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const impersonatedCompanyId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedCompanyId : profile.company_id

  if (!companyId) redirect("/login")

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch final stage IDs and lead IDs separately to avoid subquery issues
  const { data: finalStages } = await supabase
    .from("lead_stages")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_final", true)
  const finalStageIds = (finalStages || []).map((s) => s.id)

  const { data: companyLeads } = await supabase
    .from("leads")
    .select("id")
    .eq("company_id", companyId)
  const leadIds = (companyLeads || []).map((l) => l.id)

  const [
    { count: totalLeads },
    { count: weekLeads },
    { count: closedLeads },
    { count: pendingTasks },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", weekAgo),
    finalStageIds.length > 0
      ? supabase.from("leads").select("id", { count: "exact", head: true }).eq("company_id", companyId).in("stage_id", finalStageIds)
      : Promise.resolve({ count: 0, data: null, error: null, status: 200, statusText: "OK" }),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "pending"),
    leadIds.length > 0
      ? supabase.from("lead_activities")
          .select("*, lead:leads(first_name, last_name), profile:profiles(full_name)")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [], error: null, status: 200, statusText: "OK" }),
  ])

  const activityLabels: Record<string, string> = {
    lead_created: "Nuevo lead",
    lead_closed: "Lead cerrado",
    stage_changed: "Etapa actualizada",
    note_added: "Nota agregada",
    task_created: "Tarea creada",
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Resumen de tu actividad</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total leads" value={totalLeads || 0} icon={<Zap className="w-5 h-5" />} />
        <StatCard title="Leads esta semana" value={weekLeads || 0} icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard title="Clientes cerrados" value={closedLeads || 0} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Tareas pendientes" value={pendingTasks || 0} icon={<CheckSquare className="w-5 h-5" />} />
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Actividad reciente</h2>
        {recentActivity && recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{activityLabels[activity.type] || activity.type}</span>
                    {" — "}
                    {activity.lead?.first_name} {activity.lead?.last_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(activity.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No hay actividad reciente</p>
        )}
      </div>
    </div>
  )
}
