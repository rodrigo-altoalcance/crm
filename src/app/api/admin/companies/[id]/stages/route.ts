import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("lead_stages")
    .select("*")
    .eq("company_id", companyId)
    .order("position")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name, color, position, is_final, is_lost } = await request.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("lead_stages")
    .insert({
      company_id: companyId,
      name,
      color: color || "#6366F1",
      position: position ?? 0,
      is_final: is_final ?? false,
      is_lost: is_lost ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const stages = await request.json()
  const admin = createAdminClient()

  const updates = stages.map((s: { id: string; position: number }) =>
    admin.from("lead_stages").update({ position: s.position }).eq("id", s.id).eq("company_id", companyId)
  )

  await Promise.all(updates)
  return NextResponse.json({ success: true })
}
