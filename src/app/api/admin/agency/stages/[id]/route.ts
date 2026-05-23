import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await request.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("agency_stages")
    .update(body)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("admin_audit_log").insert({
    user_id: profile.id,
    user_name: profile.full_name,
    action: `Etapa actualizada: ${data.name}`,
    section: "stages",
    details: body,
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
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { count } = await admin
    .from("agency_leads")
    .select("*", { count: "exact", head: true })
    .eq("stage_id", id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: hay ${count} lead(s) en esta etapa` },
      { status: 409 }
    )
  }

  const { data: stage } = await admin
    .from("agency_stages")
    .select("name")
    .eq("id", id)
    .single()

  const { error } = await admin.from("agency_stages").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("admin_audit_log").insert({
    user_id: profile.id,
    user_name: profile.full_name,
    action: `Etapa eliminada: ${stage?.name || id}`,
    section: "stages",
    details: { id },
  })

  return NextResponse.json({ success: true })
}
