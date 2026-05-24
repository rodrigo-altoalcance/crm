import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { generateInviteLink } from "@/lib/auth/invite"
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

  let inviteResult: { action_link: string; user_id: string }
  try {
    inviteResult = await generateInviteLink(email, {
      role: role || "company_admin",
      company_id: id,
      full_name,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error generando invitación"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  try {
    await sendInvitationEmail({
      to: email,
      inviteeName: full_name,
      companyName: company.name,
      inviteLink: inviteResult.action_link,
    })
  } catch (emailError) {
    console.error("Error enviando email de invitación:", emailError)
  }

  return NextResponse.json({ id: inviteResult.user_id }, { status: 201 })
}
