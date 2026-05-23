import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("agency_stages")
    .select("*")
    .order("position")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { name, color, position, is_final, is_lost } = await request.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("agency_stages")
    .insert({
      name,
      color: color || "#6366F1",
      position: position ?? 0,
      is_final: is_final ?? false,
      is_lost: is_lost ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("admin_audit_log").insert({
    user_id: profile.id,
    user_name: profile.full_name,
    action: `Etapa creada: ${name}`,
    section: "stages",
    details: { name, color },
  })

  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const stages = await request.json()
  const admin = createAdminClient()

  const updates = stages.map((s: { id: string; position: number }) =>
    admin.from("agency_stages").update({ position: s.position }).eq("id", s.id)
  )

  await Promise.all(updates)
  return NextResponse.json({ success: true })
}
