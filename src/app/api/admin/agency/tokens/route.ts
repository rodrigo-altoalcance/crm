import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("agency_webhook_tokens")
    .select("*")
    .order("created_at")

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { name } = await request.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("agency_webhook_tokens")
    .insert({ name })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("admin_audit_log").insert({
    user_id: profile.id,
    user_name: profile.full_name,
    action: `Token de integración creado: ${name}`,
    section: "integrations",
    details: { name },
  })

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { id, field_mapping } = await request.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("agency_webhook_tokens")
    .update({ field_mapping })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("admin_audit_log").insert({
    user_id: profile.id,
    user_name: profile.full_name,
    action: `Mapeo de campos actualizado: ${data.name}`,
    section: "integrations",
    details: { id, field_mapping },
  })

  return NextResponse.json(data)
}
