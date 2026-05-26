import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { generateInviteLink } from "@/lib/auth/invite"
import { sendWelcomeEmail } from "@/lib/email/welcome"

export async function GET() {
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { admin_full_name, admin_email, ...companyFields } = await request.json()

  if (!admin_email) {
    return NextResponse.json({ error: "El correo del administrador es requerido" }, { status: 400 })
  }

  const { data: company, error } = await supabase
    .from("companies")
    .insert(companyFields)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Seed default pipeline stages for the new company
  await supabase.rpc("seed_default_stages", { p_company_id: company.id })

  let inviteLink: string
  try {
    const result = await generateInviteLink(admin_email, {
      role: "company_admin",
      company_id: company.id,
      full_name: admin_full_name || "",
    })
    inviteLink = result.action_link
  } catch (inviteError: unknown) {
    const msg = inviteError instanceof Error ? inviteError.message : "Error generando link de invitación"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  try {
    await sendWelcomeEmail({
      to: admin_email,
      companyName: company.name,
      verificationLink: inviteLink,
    })
  } catch (emailError) {
    console.error("Error enviando email de bienvenida:", emailError)
  }

  return NextResponse.json(company, { status: 201 })
}
