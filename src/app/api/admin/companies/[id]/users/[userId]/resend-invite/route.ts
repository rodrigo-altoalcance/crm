import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { generateInviteLink } from "@/lib/auth/invite"
import { sendInvitationEmail } from "@/lib/email/invitation"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: target, error: findError } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .eq("company_id", id)
    .single()

  if (findError || !target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId)
  if (authError || !authUser.user?.email) {
    return NextResponse.json({ error: "No se pudo obtener el email del usuario" }, { status: 500 })
  }

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", id)
    .single()

  let inviteResult: { action_link: string }
  try {
    inviteResult = await generateInviteLink(authUser.user.email, {
      role: target.role,
      company_id: id,
      full_name: target.full_name,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error generando invitación"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  try {
    await sendInvitationEmail({
      to: authUser.user.email,
      inviteeName: target.full_name,
      companyName: company?.name ?? "",
      inviteLink: inviteResult.action_link,
    })
  } catch (emailError) {
    console.error("Error reenviando email de invitación:", emailError)
  }

  return NextResponse.json({ success: true })
}
