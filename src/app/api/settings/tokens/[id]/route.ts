import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (profile.role === "seller") return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const { error } = await supabase
    .from("webhook_tokens")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (profile.role === "seller") return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  // Fetch existing token to get its name
  const { data: existing } = await supabase
    .from("webhook_tokens")
    .select("name")
    .eq("id", id)
    .eq("company_id", companyId)
    .single()

  if (!existing) return NextResponse.json({ error: "Token no encontrado" }, { status: 404 })

  // Delete old token
  await supabase.from("webhook_tokens").delete().eq("id", id).eq("company_id", companyId)

  // Create new token with same name
  const { data, error } = await supabase
    .from("webhook_tokens")
    .insert({ company_id: companyId, name: existing.name })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
