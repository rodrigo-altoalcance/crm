import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin
    .from("custom_lead_fields")
    .select("*")
    .eq("context", "company")
    .eq("company_id", companyId)
    .order("orden")

  return NextResponse.json(data || [])
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { nombre, tipo, obligatorio } = await request.json()
  if (!nombre?.trim() || !tipo) return NextResponse.json({ error: "Nombre y tipo son requeridos" }, { status: 400 })

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("custom_lead_fields")
    .select("orden")
    .eq("context", "company")
    .eq("company_id", companyId)
    .order("orden", { ascending: false })
    .limit(1)
    .single()

  const orden = (existing?.orden ?? -1) + 1

  const { data, error } = await admin
    .from("custom_lead_fields")
    .insert({ context: "company", company_id: companyId, nombre: nombre.trim(), tipo, obligatorio: !!obligatorio, orden })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
