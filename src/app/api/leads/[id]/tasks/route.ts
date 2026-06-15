import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { createCalendarEvent } from "@/lib/google-calendar"

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

  const { data: lead } = await supabase
    .from("leads")
    .select("id, first_name, last_name")
    .eq("id", id)
    .eq("company_id", companyId)
    .single()
  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })

  const body = await request.json()
  const { title, description, assigned_to, due_date, priority, sync_to_calendar } = body

  const admin = createAdminClient()
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
    await admin.from("notifications").insert({
      user_id: assigned_to,
      type: "task_assigned",
      title: `Te asignaron una tarea: ${title}`,
      related_task_id: data.id,
    })
  }

  // Google Calendar sync
  let calendarSyncFailed = false
  if (sync_to_calendar && due_date) {
    const targetUserId = assigned_to || profile.id

    // Verify target user has Calendar connected (via admin to bypass RLS)
    const { data: tokenRow } = await admin
      .from("user_google_calendar_tokens")
      .select("user_id")
      .eq("user_id", targetUserId)
      .single()

    if (tokenRow) {
      const leadName = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim()
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
          await supabase
            .from("tasks")
            .update({ google_calendar_event_id: eventId })
            .eq("id", data.id)
        } else {
          calendarSyncFailed = true
        }
      } catch (err) {
        console.error("[calendar] createCalendarEvent failed:", err)
        calendarSyncFailed = true
      }
    }
  }

  return NextResponse.json(
    { ...data, _calendarSyncFailed: calendarSyncFailed },
    { status: 201 }
  )
}
