import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const { id: companyId, leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { field_id, valor } = await request.json()
  if (!field_id) return NextResponse.json({ error: "field_id requerido" }, { status: 400 })

  const admin = createAdminClient()

  const { data: field } = await admin
    .from("custom_lead_fields")
    .select("id")
    .eq("id", field_id)
    .eq("context", "company")
    .eq("company_id", companyId)
    .single()
  if (!field) return NextResponse.json({ error: "Campo no encontrado" }, { status: 404 })

  await admin.from("custom_lead_field_values").delete().eq("field_id", field_id).eq("lead_id", leadId)

  if (valor !== null && valor !== undefined && valor !== "") {
    const { error } = await admin
      .from("custom_lead_field_values")
      .insert({ field_id, lead_id: leadId, valor: String(valor) })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
