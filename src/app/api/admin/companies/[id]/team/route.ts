import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { getDefaultPermissions } from "@/lib/auth/roles"
import { sendInvitationEmail } from "@/lib/email/invitation"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  const { data: company } = await admin
    .from("companies")
    .select("max_users, name")
    .eq("id", companyId)
    .single()

  if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })

  const { count: currentCount } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)

  if (currentCount !== null && currentCount >= company.max_users) {
    return NextResponse.json({ error: `Límite de usuarios alcanzado (${company.max_users})` }, { status: 400 })
  }

  const { full_name, email, role, permissions } = await request.json()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${siteUrl}/activar-cuenta`,
      data: {
        role: role || "seller",
        company_id: companyId,
        full_name,
        permissions: JSON.stringify(permissions || getDefaultPermissions()),
      },
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { userId } = await request.json()
  const admin = createAdminClient()

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
