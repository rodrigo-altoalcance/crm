import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(request: Request) {
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get("company_id")

  let query = supabase
    .from("leads")
    .select("*, stage:lead_stages(*), company:companies(id, name)")
    .order("created_at", { ascending: false })

  if (companyId) {
    query = query.eq("company_id", companyId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const {
    company_id,
    stage_id,
    first_name,
    last_name,
    email,
    phone,
    message,
    source,
  } = await request.json()

  if (!company_id || !stage_id || !first_name || !last_name || !email) {
    return NextResponse.json(
      { error: "company_id, stage_id, first_name, last_name y email son requeridos" },
      { status: 400 }
    )
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      company_id,
      stage_id,
      first_name,
      last_name,
      email,
      phone: phone || null,
      message: message || null,
      source: source || "manual",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Insert lead_created activity
  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    user_id: profile.id,
    type: "lead_created",
    description: "Lead creado desde el panel de administración",
    metadata: {},
  })

  return NextResponse.json(lead, { status: 201 })
}
