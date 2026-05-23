import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ companyId: string; id: string }> }
) {
  const { companyId, id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("webhook_tokens")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ companyId: string; id: string }> }
) {
  const { companyId, id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("webhook_tokens")
    .select("name")
    .eq("id", id)
    .eq("company_id", companyId)
    .single()

  if (!existing) return NextResponse.json({ error: "Token no encontrado" }, { status: 404 })

  await admin.from("webhook_tokens").delete().eq("id", id).eq("company_id", companyId)

  const { data, error } = await admin
    .from("webhook_tokens")
    .insert({ company_id: companyId, name: existing.name })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
