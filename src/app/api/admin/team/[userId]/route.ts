import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { isLastActiveSuperAdmin, setUserBanned } from "@/lib/auth/teamGuards"

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

  const body = await request.json()
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

  if (typeof body.active === "boolean") {
    if (userId === profile.id) {
      return NextResponse.json({ error: "No puedes desactivarte a ti mismo" }, { status: 400 })
    }
    if (!body.active && (await isLastActiveSuperAdmin(admin, userId))) {
      return NextResponse.json(
        { error: "No puedes desactivar al último super admin activo" },
        { status: 400 }
      )
    }
    const { error } = await setUserBanned(admin, userId, !body.active)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (userId === profile.id) {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 })
  }

  const role: AgencyRole = ALLOWED_ROLES.includes(body.role) ? body.role : "agency_member"

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

  if (await isLastActiveSuperAdmin(admin, userId)) {
    return NextResponse.json(
      { error: "No puedes eliminar al último super admin activo" },
      { status: 400 }
    )
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
