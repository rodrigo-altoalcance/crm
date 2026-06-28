import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { createCalendarEvent } from "@/lib/google-calendar"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
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
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await request.json()
  const { title, description, assigned_to, due_date, priority, sync_to_calendar } = body
  if (!title) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 })

  const admin = createAdminClient()

  // Fetch lead name for calendar event description
  const { data: lead } = await admin
    .from("agency_leads")
    .select("id, first_name, last_name")
    .eq("id", id)
    .single()

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

  if (assigned_to && assigned_to !== profile.id) {
    await admin.from("notifications").insert({
      user_id: assigned_to,
      type: "task_assigned",
      title: `Te asignaron una tarea: ${title}`,
    })
  }

  // Google Calendar sync
  let calendarSyncFailed = false
  if (sync_to_calendar && due_date) {
    const targetUserId = assigned_to || profile.id

    const { data: tokenRow } = await admin
      .from("user_google_calendar_tokens")
      .select("user_id")
      .eq("user_id", targetUserId)
      .single()

    if (tokenRow) {
      const leadName = lead
        ? `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim()
        : ""
      const startDt = new Date(due_date)
      const endDt = new Date(startDt.getTime() + 60 * 60 * 1000)

      try {
        const eventId = await createCalendarEvent(targetUserId, {
          summary: `[Tarea CRM] ${title}`,
          description: `Lead: ${leadName}\nCreada por: ${profile.full_name}`,
          start: { dateTime: startDt.toISOString(), timeZone: "America/Santiago" },
          end: { dateTime: endDt.toISOString(), timeZone: "America/Santiago" },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 30 },
              { method: "email", minutes: 60 },
            ],
          },
        })

        if (eventId) {
          await admin
            .from("agency_tasks")
            .update({ google_calendar_event_id: eventId })
            .eq("id", task.id)
        } else {
          calendarSyncFailed = true
        }
      } catch (err) {
        console.error("[calendar] createCalendarEvent failed (agency):", err)
        calendarSyncFailed = true
      }
    }
  }

  return NextResponse.json(
    { ...task, _calendarSyncFailed: calendarSyncFailed },
    { status: 201 }
  )
}
