import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { sendWelcomeEmail } from "@/lib/email/welcome"

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

  const { full_name, email, password, role } = await request.json()

  if (!email) {
    return NextResponse.json({ error: "El email es requerido" }, { status: 400 })
  }
  if (!full_name) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
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

  // Create user with password + generate email confirmation link in one call.
  // email_confirm is false by default for type "signup", so the user must click
  // the action_link before they can log in.
  const { data: linkData, error } = await adminClient.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
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

  const verificationLink = linkData.properties.action_link

  try {
    await sendWelcomeEmail({
      to: email,
      companyName: company.name,
      verificationLink,
    })
  } catch (emailError) {
    console.error("Error enviando email de bienvenida:", emailError)
  }

  return NextResponse.json(linkData.user, { status: 201 })
}
