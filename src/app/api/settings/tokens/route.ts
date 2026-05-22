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

  const { data } = await supabase.from("webhook_tokens").select("*").eq("company_id", companyId).order("created_at")
  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  if (profile.role === "seller") return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { name } = await request.json()
  const { data, error } = await supabase
    .from("webhook_tokens")
    .insert({ company_id: companyId, name })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  if (profile.role === "seller") return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id, field_mapping } = await request.json()
  const { data, error } = await supabase
    .from("webhook_tokens")
    .update({ field_mapping })
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
