import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const rawDays = parseInt(searchParams.get("days") || "7")
  const days = isNaN(rawDays) || rawDays < 1 ? 7 : Math.min(rawDays, 90)

  const admin = createAdminClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const [{ data: stages }, { data: companies }, { data: leads, error: leadsError }] = await Promise.all([
    admin.from("lead_stages").select("id, is_final"),
    admin.from("companies").select("id, name"),
    admin.from("leads").select("id, company_id, stage_id").gte("created_at", since.toISOString()),
  ])

  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 })

  const finalStageSet = new Set((stages || []).filter((s) => s.is_final).map((s) => s.id))
  const companyNameMap: Record<string, string> = {}
  for (const c of companies || []) companyNameMap[c.id] = c.name

  const resultMap = new Map<string, { company_id: string; company_name: string; leads_open: number; leads_closed: number }>()

  for (const lead of leads || []) {
    if (!lead.company_id || !companyNameMap[lead.company_id]) continue
    if (!resultMap.has(lead.company_id)) {
      resultMap.set(lead.company_id, {
        company_id: lead.company_id,
        company_name: companyNameMap[lead.company_id],
        leads_open: 0,
        leads_closed: 0,
      })
    }
    const entry = resultMap.get(lead.company_id)!
    if (finalStageSet.has(lead.stage_id)) {
      entry.leads_closed++
    } else {
      entry.leads_open++
    }
  }

  const result = Array.from(resultMap.values()).sort(
    (a, b) => b.leads_open + b.leads_closed - (a.leads_open + a.leads_closed)
  )

  return NextResponse.json(result)
}
