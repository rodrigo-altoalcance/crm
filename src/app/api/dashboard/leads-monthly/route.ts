import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { getMonthBucketsSantiago } from "@/lib/dateRanges"

const ALLOWED_MONTHS = [3, 6, 9, 12]

/** Convierte un timestamp ISO a su fecha de calendario (YYYY-MM-DD) en America/Santiago. */
function toSantiagoDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date(iso))
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const rawMonths = parseInt(searchParams.get("months") || "6")
  const months = ALLOWED_MONTHS.includes(rawMonths) ? rawMonths : 6

  const buckets = getMonthBucketsSantiago(months)
  const rangeStart = buckets[0].startDate

  // Leads creados en el rango, filtrados por empresa (RLS + filtro explícito).
  const { data: createdLeads, error: createdError } = await supabase
    .from("leads")
    .select("id, created_at")
    .eq("company_id", companyId)
    .gte("created_at", rangeStart)

  if (createdError) return NextResponse.json({ error: createdError.message }, { status: 500 })

  // Leads actualmente en etapa final de esta empresa.
  const { data: finalStages, error: stagesError } = await supabase
    .from("lead_stages")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_final", true)

  if (stagesError) return NextResponse.json({ error: stagesError.message }, { status: 500 })
  const finalStageIds = (finalStages || []).map((s) => s.id)

  let closedLeadIds: string[] = []
  if (finalStageIds.length > 0) {
    const { data: closedLeads, error: closedLeadsError } = await supabase
      .from("leads")
      .select("id")
      .eq("company_id", companyId)
      .in("stage_id", finalStageIds)

    if (closedLeadsError) return NextResponse.json({ error: closedLeadsError.message }, { status: 500 })
    closedLeadIds = (closedLeads || []).map((l) => l.id)
  }

  // Fecha en que cada lead cerrado fue marcado como cerrado: el evento
  // lead_closed más reciente de lead_activities para ese lead.
  const closedAtByLead = new Map<string, string>()
  if (closedLeadIds.length > 0) {
    const { data: closeEvents, error: closeEventsError } = await supabase
      .from("lead_activities")
      .select("lead_id, created_at")
      .in("lead_id", closedLeadIds)
      .eq("type", "lead_closed")
      .order("created_at", { ascending: false })

    if (closeEventsError) return NextResponse.json({ error: closeEventsError.message }, { status: 500 })
    for (const ev of closeEvents || []) {
      if (ev.lead_id && !closedAtByLead.has(ev.lead_id)) {
        closedAtByLead.set(ev.lead_id, ev.created_at)
      }
    }
  }

  // Bucketing por fecha de calendario en Santiago (no por timestamp UTC crudo).
  const createdDates = (createdLeads || []).map((l) => toSantiagoDate(l.created_at))
  const closedDates = Array.from(closedAtByLead.values()).map((iso) => toSantiagoDate(iso))

  const result = buckets.map((bucket) => {
    const leads_created = createdDates.filter(
      (d) => d >= bucket.startDate && d < bucket.nextMonthStart
    ).length

    const leads_closed = closedDates.filter(
      (d) => d >= bucket.startDate && d < bucket.nextMonthStart
    ).length

    return { key: bucket.key, label: bucket.label, leads_created, leads_closed }
  })

  return NextResponse.json(result)
}
