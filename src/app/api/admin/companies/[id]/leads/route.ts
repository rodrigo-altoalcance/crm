import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("leads")
    .select("*, stage:lead_stages(*), assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { first_name, last_name, email, phone, message, source, stage_id, assigned_to, scheduled_at } = body

  const admin = createAdminClient()
  const { data: lead, error } = await admin
    .from("leads")
    .insert({ company_id: companyId, first_name, last_name, email, phone, message, source: source || "manual", stage_id, assigned_to, scheduled_at: scheduled_at || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("lead_activities").insert({
    lead_id: lead.id,
    user_id: profile.id,
    type: "lead_created",
    description: `Lead creado desde panel admin por ${profile.full_name}`,
  })

  return NextResponse.json(lead, { status: 201 })
}
