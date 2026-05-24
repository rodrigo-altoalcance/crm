import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { sendInvitationEmail } from "@/lib/email/invitation"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", id)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { full_name, email, role } = await request.json()

  if (!email) {
    return NextResponse.json({ error: "El email es requerido" }, { status: 400 })
  }
  if (!full_name) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
  }

  const { data: company } = await supabase
    .from("companies")
    .select("max_users, name")
    .eq("id", id)
    .single()

  if (!company) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
  }

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", id)

  if (count !== null && count >= company.max_users) {
    return NextResponse.json(
      { error: `Se alcanzó el límite de ${company.max_users} usuarios` },
      { status: 422 }
    )
  }

  const adminClient = createAdminClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const { data: linkData, error } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${siteUrl}/activar-cuenta`,
      data: {
        role: role || "company_admin",
        company_id: id,
        full_name,
      },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    await sendInvitationEmail({
      to: email,
      inviteeName: full_name,
      companyName: company.name,
      inviteLink: linkData.properties.action_link,
    })
  } catch (emailError) {
    console.error("Error enviando email de invitación:", emailError)
  }

  return NextResponse.json(linkData.user, { status: 201 })
}
