import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  const [{ data: companies }, { data: leads }, { data: leadActs }] = await Promise.all([
    admin.from("companies").select("id, name, status"),
    admin.from("leads").select("id, company_id"),
    admin.from("lead_activities").select("lead_id"),
  ])

  // Map lead_id -> company_id
  const leadToCompany: Record<string, string> = {}
  for (const l of leads || []) {
    if (l.id && l.company_id) leadToCompany[l.id] = l.company_id
  }

  // Count lead_activities per company
  const leadActsByCompany: Record<string, number> = {}
  for (const act of leadActs || []) {
    const companyId = act.lead_id ? leadToCompany[act.lead_id] : null
    if (companyId) leadActsByCompany[companyId] = (leadActsByCompany[companyId] || 0) + 1
  }

  // Try agency_client_activities — table may not exist yet
  const agencyActsByCompany: Record<string, number> = {}
  const { data: agencyActs, error: agencyError } = await admin
    .from("agency_client_activities")
    .select("company_id")
  if (!agencyError) {
    for (const act of agencyActs || []) {
      if (act.company_id) agencyActsByCompany[act.company_id] = (agencyActsByCompany[act.company_id] || 0) + 1
    }
  }

  const ranking = (companies || [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status as string,
      lead_activities_count: leadActsByCompany[c.id] || 0,
      agency_activities_count: agencyActsByCompany[c.id] || 0,
      total: (leadActsByCompany[c.id] || 0) + (agencyActsByCompany[c.id] || 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return NextResponse.json(ranking)
}
