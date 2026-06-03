import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId =
    profile.role === "super_admin" ? impersonatedId : profile.company_id

  // Build query: super_admin without impersonation can access any task
  let existingQuery = supabase
    .from("tasks")
    .select("id, lead_id, title, status, assigned_to")
    .eq("id", id)
  if (companyId) existingQuery = existingQuery.eq("company_id", companyId)

  const { data: existing } = await existingQuery.single()

  if (!existing) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })

  const body = await request.json()
  const { title, description, assigned_to, due_date, priority, status } = body

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (assigned_to !== undefined) updates.assigned_to = assigned_to
  if (due_date !== undefined) updates.due_date = due_date
  if (priority !== undefined) updates.priority = priority
  if (status !== undefined) updates.status = status

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificar cuando cambia el responsable
  if (
    assigned_to !== undefined &&
    assigned_to !== null &&
    assigned_to !== existing.assigned_to &&
    assigned_to !== profile.id
  ) {
    const adminClient = createAdminClient()
    await adminClient.from("notifications").insert({
      user_id: assigned_to,
      type: "task_assigned",
      title: `Te asignaron una tarea: ${data.title ?? existing.title}`,
      related_task_id: id,
    })
  }

  // When task is marked completed and linked to a lead, auto-generate history entry
  if (status === "completed" && existing.status !== "completed" && existing.lead_id) {
    const { data: lastComment } = await supabase
      .from("task_comments")
      .select("text")
      .eq("task_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    await supabase.from("lead_activities").insert({
      lead_id: existing.lead_id,
      user_id: profile.id,
      type: "task_completed",
      description: existing.title,
      metadata: {
        task_id: id,
        closing_comment: lastComment?.text ?? null,
      },
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (profile.role !== "company_admin" && profile.role !== "super_admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const cookieStore2 = await cookies()
  const companyId2 = profile.role === "super_admin"
    ? cookieStore2.get("impersonated_company")?.value
    : profile.company_id

  let deleteQuery = supabase.from("tasks").delete().eq("id", id)
  if (companyId2) deleteQuery = deleteQuery.eq("company_id", companyId2)

  const { error } = await deleteQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
