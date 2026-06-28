import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("agency_tasks")
    .select("id, lead_id, title, status, assigned_to, google_calendar_event_id")
    .eq("id", id)
    .single()

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

  const { data, error } = await admin
    .from("agency_tasks")
    .update(updates)
    .eq("id", id)
    .select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify new assignee
  if (
    assigned_to !== undefined &&
    assigned_to !== null &&
    assigned_to !== existing.assigned_to &&
    assigned_to !== profile.id
  ) {
    await admin.from("notifications").insert({
      user_id: assigned_to,
      type: "task_assigned",
      title: `Te asignaron una tarea: ${data.title ?? existing.title}`,
    })
  }

  // When task is completed, add lead activity and update Google Calendar event
  if (status === "completed" && existing.status !== "completed" && existing.lead_id) {
    const { data: lastComment } = await admin
      .from("agency_task_comments")
      .select("text")
      .eq("task_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    await admin.from("agency_lead_activities").insert({
      lead_id: existing.lead_id,
      user_id: profile.id,
      type: "task_completed",
      description: existing.title,
      metadata: {
        task_id: id,
        closing_comment: lastComment?.text ?? null,
      },
    })

    // Update Google Calendar event to mark as completed (best effort)
    if (existing.google_calendar_event_id) {
      const calendarUserId = existing.assigned_to || profile.id
      updateCalendarEvent(calendarUserId, existing.google_calendar_event_id, {
        summary: `✓ Completada: ${existing.title}`,
      }).catch((err) => console.error("[calendar] updateCalendarEvent failed (agency):", err))
    }
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
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Fetch task before deleting to get calendar event id
  const { data: existing } = await admin
    .from("agency_tasks")
    .select("id, assigned_to, google_calendar_event_id")
    .eq("id", id)
    .single()

  const { error } = await admin.from("agency_tasks").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Delete Google Calendar event (best effort — don't block response)
  if (existing?.google_calendar_event_id) {
    const calendarUserId = existing.assigned_to || profile.id
    deleteCalendarEvent(calendarUserId, existing.google_calendar_event_id).catch((err) =>
      console.error("[calendar] deleteCalendarEvent failed (agency):", err)
    )
  }

  return NextResponse.json({ success: true })
}
