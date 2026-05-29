import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LeadsView } from "@/components/leads/LeadsView"
import { Plus } from "lucide-react"
import type { Lead, LeadStage } from "@/types/database"

export default async function AdminLeadsPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()
  const [{ data: agencyStages }, { data: agencyLeads }, { data: teamMembers }, { data: recentActivities }, { data: customFields }, { data: columnPrefsRows }] = await Promise.all([
    admin.from("agency_stages").select("*").order("position"),
    admin
      .from("agency_leads")
      .select("*, stage:agency_stages(*), assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, avatar_url, role").eq("role", "super_admin"),
    admin
      .from("agency_lead_activities")
      .select("lead_id, description, type, created_at")
      .in("type", ["stage_changed", "lead_closed", "note_added", "comment", "task_completed"])
      .order("created_at", { ascending: false }),
    admin.from("custom_lead_fields").select("*").eq("context", "agency").is("company_id", null).order("orden"),
    supabase.from("user_lead_column_preferences").select("column_key, visible").eq("user_id", profile.id).eq("context", "agency").is("company_id", null),
  ])

  // Build map: lead_id -> last activity description
  const lastCommentMap: Record<string, string> = {}
  for (const act of recentActivities || []) {
    if (act.lead_id && !(act.lead_id in lastCommentMap) && act.description) {
      lastCommentMap[act.lead_id] = act.description
    }
  }

  // Map agency_stages to LeadStage shape
  const stages: LeadStage[] = (agencyStages || []).map((s) => ({
    ...s,
    company_id: "agency",
  }))

  const initialColumnPrefs: Record<string, boolean> = {}
  for (const row of columnPrefsRows || []) initialColumnPrefs[row.column_key] = row.visible

  const agencyLeadIds = (agencyLeads || []).map((l) => l.id)
  let fieldValuesMap: Record<string, Record<string, string>> = {}
  if (agencyLeadIds.length > 0 && (customFields || []).length > 0) {
    const { data: allValues } = await admin
      .from("custom_lead_field_values")
      .select("lead_id, field_id, valor")
      .in("lead_id", agencyLeadIds)
    for (const v of allValues || []) {
      if (!fieldValuesMap[v.lead_id]) fieldValuesMap[v.lead_id] = {}
      fieldValuesMap[v.lead_id][v.field_id] = v.valor ?? ""
    }
  }

  // Map agency_leads to Lead shape for reuse in shared components
  const leads: Lead[] = (agencyLeads || []).map((l) => ({
    id: l.id,
    company_id: "agency",
    stage_id: l.stage_id ?? "",
    first_name: l.first_name ?? "",
    last_name: l.last_name ?? "",
    email: l.email ?? "",
    phone: l.phone ?? null,
    message: l.message ?? null,
    source: (l.source as Lead["source"]) ?? "manual",
    assigned_to: l.assigned_to ?? null,
    notes: null,
    custom_fields: l.custom_fields ?? {},
    scheduled_at: null,
    created_at: l.created_at,
    updated_at: l.updated_at ?? l.created_at,
    stage: l.stage ? { ...l.stage, company_id: "agency" } : undefined,
    assigned_profile: l.assigned_profile ?? undefined,
    last_comment: lastCommentMap[l.id] ?? null,
  } as Lead & { last_comment: string | null }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">{leads.length} leads de la agencia</p>
        </div>
        <Button asChild>
          <Link href="/admin/leads/new">
            <Plus className="w-4 h-4" /> Nuevo lead
          </Link>
        </Button>
      </div>
      <LeadsView
        leads={leads}
        stages={stages}
        teamMembers={teamMembers || []}
        profile={profile}
        companyId="agency"
        basePath="/admin/leads"
        apiPrefix="/api/admin/agency"
        customFields={customFields || []}
        initialColumnPrefs={initialColumnPrefs}
        fieldValuesMap={fieldValuesMap}
        columnPrefsApiPrefix="/api/admin/agency"
      />
    </div>
  )
}
