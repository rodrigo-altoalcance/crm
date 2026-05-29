import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { LeadsView } from "@/components/leads/LeadsView"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function LeadsPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const impersonatedCompanyId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedCompanyId : profile.company_id
  if (!companyId) redirect("/login")

  const [{ data: stages }, { data: leads }, { data: teamMembers }, { data: recentActivities }, { data: customFields }, { data: columnPrefsRows }] = await Promise.all([
    supabase.from("lead_stages").select("*").eq("company_id", companyId).order("position"),
    supabase.from("leads").select("*, stage:lead_stages(*), assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, avatar_url, role").eq("company_id", companyId),
    supabase
      .from("lead_activities")
      .select("lead_id, description, type, created_at")
      .in("type", ["stage_changed", "lead_closed", "note_added", "comment", "task_completed"])
      .order("created_at", { ascending: false }),
    supabase.from("custom_lead_fields").select("*").eq("context", "company").eq("company_id", companyId).order("orden"),
    supabase.from("user_lead_column_preferences").select("column_key, visible").eq("user_id", profile.id).eq("context", "company").eq("company_id", companyId),
  ])

  const lastCommentMap: Record<string, string> = {}
  for (const act of recentActivities || []) {
    if (act.lead_id && !(act.lead_id in lastCommentMap) && act.description) {
      lastCommentMap[act.lead_id] = act.description
    }
  }

  const leadsWithComment = (leads || []).map((l) => ({ ...l, last_comment: lastCommentMap[l.id] ?? null }))

  const initialColumnPrefs: Record<string, boolean> = {}
  for (const row of columnPrefsRows || []) initialColumnPrefs[row.column_key] = row.visible

  const leadIds = (leads || []).map((l) => l.id)
  let fieldValuesMap: Record<string, Record<string, string>> = {}
  if (leadIds.length > 0 && (customFields || []).length > 0) {
    const { data: allValues } = await supabase
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">{leads?.length || 0} leads en total</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/leads/new">
            <Plus className="w-4 h-4" /> Nuevo lead
          </Link>
        </Button>
      </div>
      <LeadsView
        leads={leadsWithComment}
        stages={stages || []}
        teamMembers={teamMembers || []}
        profile={profile}
        companyId={companyId}
        customFields={customFields || []}
        initialColumnPrefs={initialColumnPrefs}
        fieldValuesMap={fieldValuesMap}
        columnPrefsApiPrefix="/api/settings"
      />
    </div>
  )
}
