import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("agency_tasks")
    .select("*, assigned_profile:profiles!assigned_to(full_name)")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { title, description, assigned_to, due_date, priority } = await request.json()
  if (!title) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 })

  const admin = createAdminClient()
  const { data: task, error } = await admin
    .from("agency_tasks")
    .insert({
      lead_id: id,
      title,
      description: description || null,
      assigned_to: assigned_to || null,
      due_date: due_date || null,
      priority: priority || "medium",
      created_by: profile.id,
    })
    .select("*, assigned_profile:profiles!assigned_to(full_name)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("agency_lead_activities").insert({
    lead_id: id,
    user_id: profile.id,
    type: "task_created",
    description: `Tarea creada: "${title}" por ${profile.full_name}`,
  })

  return NextResponse.json(task, { status: 201 })
}
