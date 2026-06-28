import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { full_name, role, phone } = body

  if (full_name !== undefined && typeof full_name !== "string") {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 })
  }
  if (role !== undefined && !["company_admin", "seller"].includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: target, error: findError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .eq("company_id", id)
    .single()

  if (findError || !target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { error } = await admin
    .from("profiles")
    .update({ full_name, role, phone: phone ?? null })
    .eq("id", userId)
    .eq("company_id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
