import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  // Verify lead belongs to this company
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .single()

  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })

  const { data, error } = await supabase
    .from("client_records")
    .select("*, profile:profiles(full_name, avatar_url)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  // Verify lead belongs to this company
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .single()

  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })

  const body = await request.json()
  const { title, description, type, record_date } = body

  if (!title) return NextResponse.json({ error: "Título requerido" }, { status: 400 })

  const { data, error } = await supabase
    .from("client_records")
    .insert({
      lead_id: leadId,
      company_id: companyId,
      created_by: profile.id,
      title,
      description: description || null,
      type: type || "note",
      record_date: record_date || null,
    })
    .select("*, profile:profiles(full_name, avatar_url)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
