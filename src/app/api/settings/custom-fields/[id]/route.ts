import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

async function getCompanyId() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return { error: "No autorizado", status: 401, supabase, companyId: null }
  if (profile.role === "seller") return { error: "Sin permiso", status: 403, supabase, companyId: null }
  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return { error: "No company", status: 403, supabase, companyId: null }
  return { error: null, status: 200, supabase, companyId }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error, status, supabase, companyId } = await getCompanyId()
  if (error || !companyId) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { data, error: dbError } = await supabase
    .from("custom_lead_fields")
    .update(body)
    .eq("id", id)
    .eq("context", "company")
    .eq("company_id", companyId)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error, status, supabase, companyId } = await getCompanyId()
  if (error || !companyId) return NextResponse.json({ error }, { status })

  const { error: dbError } = await supabase
    .from("custom_lead_fields")
    .delete()
    .eq("id", id)
    .eq("context", "company")
    .eq("company_id", companyId)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
