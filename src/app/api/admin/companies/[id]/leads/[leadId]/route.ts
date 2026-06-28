import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const { id: companyId, leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("leads")
    .select("*, stage:lead_stages(*), assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const { id: companyId, leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { first_name, last_name, email, phone, message, source, assigned_to, scheduled_at, stage_id } = body
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("leads")
    .update({ first_name, last_name, email, phone, message, source, assigned_to, scheduled_at, stage_id, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("company_id", companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const { id: companyId, leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("company_id", companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
