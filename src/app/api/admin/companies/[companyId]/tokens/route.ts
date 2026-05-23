import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("webhook_tokens")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at")

  return NextResponse.json(data || [])
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { name } = await request.json()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("webhook_tokens")
    .insert({ company_id: companyId, name })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id, field_mapping } = await request.json()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("webhook_tokens")
    .update({ field_mapping })
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
