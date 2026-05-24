import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
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

  const { admin_full_name, admin_email, admin_password, ...companyFields } = await request.json()

  if (!admin_email) {
    return NextResponse.json({ error: "El correo del administrador es requerido" }, { status: 400 })
  }
  if (!admin_password || admin_password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
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

  // Create company_admin user with password + generate email confirmation link
  const adminClient = createAdminClient()
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "signup",
    email: admin_email,
    password: admin_password,
    options: {
      data: {
        role: "company_admin",
        company_id: company.id,
        full_name: admin_full_name || "",
      },
    },
  })

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  try {
    await sendWelcomeEmail({
      to: admin_email,
      companyName: company.name,
      verificationLink: linkData.properties.action_link,
    })
  } catch (emailError) {
    console.error("Error enviando email de bienvenida:", emailError)
  }

  return NextResponse.json(company, { status: 201 })
}
