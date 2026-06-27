import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const { id: companyId, fieldId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || (profile.role !== "super_admin" && profile.role !== "agency_member")) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const body = await request.json()
  const { nombre, tipo, obligatorio, orden } = body
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("custom_lead_fields")
    .update({ nombre, tipo, obligatorio, orden })
    .eq("id", fieldId)
    .eq("context", "company")
    .eq("company_id", companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const { id: companyId, fieldId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || (profile.role !== "super_admin" && profile.role !== "agency_member")) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin
    .from("custom_lead_fields")
    .delete()
    .eq("id", fieldId)
    .eq("context", "company")
    .eq("company_id", companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
