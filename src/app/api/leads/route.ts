import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const stageId = searchParams.get("stage_id")

  let query = supabase
    .from("leads")
    .select("*, stage:lead_stages(*), assigned_profile:profiles!assigned_to(id, full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  if (stageId) query = query.eq("stage_id", stageId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const body = await request.json()
  const { first_name, last_name, email, phone, message, source, stage_id, assigned_to } = body

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({ company_id: companyId, first_name, last_name, email, phone, message, source: source || "manual", stage_id, assigned_to })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    user_id: profile.id,
    type: "lead_created",
    description: `Lead creado manualmente por ${profile.full_name}`,
  })

  return NextResponse.json(lead, { status: 201 })
}
