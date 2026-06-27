import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { generateInviteLink } from "@/lib/auth/invite"
import { sendInvitationEmail } from "@/lib/email/invitation"

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin.from("companies").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const body = await request.json()
  const {
    name, email, phone, address, website,
    monthly_fee, currency, payment_day, max_users, status,
    org_name, org_email, org_phone, org_website,
    admin_full_name, admin_email,
  } = body

  if (!name?.trim()) return NextResponse.json({ error: "El nombre de la empresa es requerido" }, { status: 400 })
  if (!admin_email?.trim()) return NextResponse.json({ error: "El correo del administrador es requerido" }, { status: 400 })

  const { data: company, error } = await admin
    .from("companies")
    .insert({
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      address: address || null,
      website: website || null,
      monthly_fee: monthly_fee ?? null,
      currency: currency || "CLP",
      payment_day: payment_day ?? null,
      max_users: max_users || 3,
      status: status || "active",
      org_name: org_name || null,
      org_email: org_email || null,
      org_phone: org_phone || null,
      org_website: org_website || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed default pipeline stages for the new company
  await supabase.rpc("seed_default_stages", { p_company_id: company.id })

  let inviteLink: string
  try {
    const result = await generateInviteLink(admin_email.trim(), {
      role: "company_admin",
      company_id: company.id,
      full_name: admin_full_name || "",
    })
    inviteLink = result.action_link
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error generando link de invitación"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  try {
    await sendInvitationEmail({
      to: admin_email.trim(),
      inviteeName: admin_full_name || admin_email,
      companyName: company.name,
      inviteLink,
    })
  } catch (emailError) {
    console.error("Error enviando email de invitación:", emailError)
  }

  return NextResponse.json(company, { status: 201 })
}
