import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data, error } = await supabase
    .from("tasks")
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
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const body = await request.json()
  const { title, description, assigned_to, due_date, priority } = body

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      company_id: companyId,
      lead_id: id,
      title,
      description,
      assigned_to,
      due_date,
      priority: priority || "medium",
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from("lead_activities").insert({
    lead_id: id,
    user_id: profile.id,
    type: "task_created",
    description: `Tarea creada: ${title}`,
  })

  if (assigned_to && assigned_to !== profile.id) {
    const adminClient = createAdminClient()
    await adminClient.from("notifications").insert({
      user_id: assigned_to,
      type: "task_assigned",
      title: `Te asignaron una tarea: ${title}`,
      related_task_id: data.id,
    })
  }

  return NextResponse.json(data, { status: 201 })
}
