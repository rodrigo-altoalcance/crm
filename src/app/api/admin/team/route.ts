import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { sendInvitationEmail } from "@/lib/email/invitation"

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("role", "super_admin")
    .order("created_at")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { full_name, email } = await request.json()
  if (!full_name || !email) {
    return NextResponse.json({ error: "Nombre y email son requeridos" }, { status: 400 })
  }

  const admin = createAdminClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://crm.altoalcance.cl"
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${siteUrl}/activar-cuenta`,
      data: {
        role: "super_admin",
        full_name,
      },
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await sendInvitationEmail({
      to: email,
      inviteeName: full_name,
      companyName: "Alto Alcance CRM",
      inviteLink: linkData.properties.action_link,
    })
  } catch (emailError) {
    console.error("Error enviando email de invitación:", emailError)
  }

  return NextResponse.json(linkData.user, { status: 201 })
}
