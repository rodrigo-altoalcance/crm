import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

const ALLOWED_ROLES = ["super_admin", "agency_member"] as const
type AgencyRole = typeof ALLOWED_ROLES[number]

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (userId === profile.id) {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 })
  }

  const body = await request.json()
  const role: AgencyRole = ALLOWED_ROLES.includes(body.role) ? body.role : "agency_member"

  const admin = createAdminClient()

  // Verify target user belongs to agency (has an agency role)
  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .in("role", ALLOWED_ROLES)
    .single()

  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (userId === profile.id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
