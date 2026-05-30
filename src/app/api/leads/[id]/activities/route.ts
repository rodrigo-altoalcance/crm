import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const { data: lead } = await supabase.from("leads").select("id").eq("id", id).eq("company_id", companyId).single()
  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })

  const { data, error } = await supabase
    .from("lead_activities")
    .select("*, profile:profiles(full_name, avatar_url)")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const { data: lead } = await supabase.from("leads").select("id").eq("id", id).eq("company_id", companyId).single()
  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })

  const { description, type = "note_added" } = await request.json()

  const { data, error } = await supabase
    .from("lead_activities")
    .insert({ lead_id: id, user_id: profile.id, type, description })
    .select("*, profile:profiles(full_name, avatar_url)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
