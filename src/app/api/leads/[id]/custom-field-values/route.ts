import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const { field_id, valor } = await request.json()
  if (!field_id) return NextResponse.json({ error: "field_id requerido" }, { status: 400 })

  // Verify field belongs to this company
  const { data: field } = await supabase
    .from("custom_lead_fields")
    .select("id")
    .eq("id", field_id)
    .eq("context", "company")
    .eq("company_id", companyId)
    .single()
  if (!field) return NextResponse.json({ error: "Campo no encontrado" }, { status: 404 })

  await supabase
    .from("custom_lead_field_values")
    .delete()
    .eq("field_id", field_id)
    .eq("lead_id", leadId)

  if (valor !== null && valor !== undefined && valor !== "") {
    const { error } = await supabase
      .from("custom_lead_field_values")
      .insert({ field_id, lead_id: leadId, valor: String(valor) })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
