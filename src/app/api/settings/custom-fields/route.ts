import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

async function getCompanyId() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return { error: "No autorizado", status: 401, supabase, profile: null, companyId: null }
  if (profile.role === "seller") return { error: "Sin permiso", status: 403, supabase, profile, companyId: null }
  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return { error: "No company", status: 403, supabase, profile, companyId: null }
  return { error: null, status: 200, supabase, profile, companyId }
}

export async function GET() {
  const { error, status, supabase, companyId } = await getCompanyId()
  if (error || !companyId) return NextResponse.json({ error }, { status })

  const { data } = await supabase
    .from("custom_lead_fields")
    .select("*")
    .eq("context", "company")
    .eq("company_id", companyId)
    .order("orden")

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const { error, status, supabase, companyId } = await getCompanyId()
  if (error || !companyId) return NextResponse.json({ error }, { status })

  const { nombre, tipo, obligatorio } = await request.json()
  if (!nombre?.trim() || !tipo) return NextResponse.json({ error: "Nombre y tipo son requeridos" }, { status: 400 })

  const { data: existing } = await supabase
    .from("custom_lead_fields")
    .select("orden")
    .eq("context", "company")
    .eq("company_id", companyId)
    .order("orden", { ascending: false })
    .limit(1)
    .single()

  const orden = (existing?.orden ?? -1) + 1

  const { data, error: dbError } = await supabase
    .from("custom_lead_fields")
    .insert({ context: "company", company_id: companyId, nombre: nombre.trim(), tipo, obligatorio: !!obligatorio, orden })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
