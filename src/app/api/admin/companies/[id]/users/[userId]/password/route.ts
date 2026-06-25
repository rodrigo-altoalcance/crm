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
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { password } = await request.json()

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
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

  const { error } = await admin.auth.admin.updateUserById(userId, { password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
