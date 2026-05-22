import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const { data, error } = await supabase
    .from("lead_stages")
    .select("*")
    .eq("company_id", companyId)
    .order("position")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  if (profile.role === "seller" && !profile.permissions?.can_manage_stages) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const { name, color, position, is_final, is_lost } = await request.json()
  const { data, error } = await supabase
    .from("lead_stages")
    .insert({ company_id: companyId, name, color: color || "#6366F1", position: position ?? 0, is_final: is_final ?? false, is_lost: is_lost ?? false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const stages = await request.json()
  const updates = stages.map((s: any) =>
    supabase.from("lead_stages").update({ position: s.position }).eq("id", s.id).eq("company_id", companyId)
  )

  await Promise.all(updates)
  return NextResponse.json({ success: true })
}
