import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

const VALID_TYPES = ["reunion", "llamada", "nota", "acuerdo", "reporte", "otro"]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  const { data: company } = await admin.from("companies").select("id").eq("id", companyId).single()
  if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })

  const { data, error } = await admin
    .from("agency_client_activities")
    .select("*, profile:profiles(full_name)")
    .eq("company_id", companyId)
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  const { data: company } = await admin.from("companies").select("id").eq("id", companyId).single()
  if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })

  const { type, title, description, activity_date } = await request.json()

  if (!type || !VALID_TYPES.includes(type))
    return NextResponse.json({ error: "Tipo de actividad inválido" }, { status: 400 })
  if (!title?.trim())
    return NextResponse.json({ error: "El título es requerido" }, { status: 400 })

  const { data, error } = await admin
    .from("agency_client_activities")
    .insert({
      company_id: companyId,
      user_id: profile.id,
      type,
      title: title.trim(),
      description: description?.trim() || null,
      activity_date: activity_date || new Date().toISOString().split("T")[0],
    })
    .select("*, profile:profiles(full_name)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
