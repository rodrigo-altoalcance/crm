import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

// POST → regenerate token
export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("agency_webhook_tokens")
    .select("*")
    .eq("id", id)
    .single()

  if (!existing) return NextResponse.json({ error: "Token no encontrado" }, { status: 404 })

  await admin.from("agency_webhook_tokens").delete().eq("id", id)

  const { data, error } = await admin
    .from("agency_webhook_tokens")
    .insert({ name: existing.name, field_mapping: existing.field_mapping })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("admin_audit_log").insert({
    user_id: profile.id,
    user_name: profile.full_name,
    action: `Token regenerado: ${existing.name}`,
    section: "integrations",
    details: { old_id: id, new_id: data.id },
  })

  return NextResponse.json(data)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("agency_webhook_tokens")
    .select("name")
    .eq("id", id)
    .single()

  const { error } = await admin.from("agency_webhook_tokens").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("admin_audit_log").insert({
    user_id: profile.id,
    user_name: profile.full_name,
    action: `Token eliminado: ${existing?.name || id}`,
    section: "integrations",
    details: { id },
  })

  return NextResponse.json({ success: true })
}
