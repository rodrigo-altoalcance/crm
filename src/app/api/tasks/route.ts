import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { canViewAllLeads } from "@/lib/auth/roles"
import { createCalendarEvent } from "@/lib/google-calendar"

export async function GET(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  let query = supabase
    .from("tasks")
    .select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url), lead:leads(id, first_name, last_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  const viewAll = canViewAllLeads(profile)
  if (profile.role === "seller" && !viewAll) {
    query = query.eq("assigned_to", profile.id)
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const body = await request.json()
  const { title, description, assigned_to, due_date, priority, status, sync_to_calendar } = body

  if (!title) return NextResponse.json({ error: "Título requerido" }, { status: 400 })

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      company_id: companyId,
      lead_id: null,
      title,
      description: description || null,
      assigned_to: assigned_to || null,
      due_date: due_date || null,
      priority: priority || "medium",
      status: status || "pending",
      created_by: profile.id,
    })
    .select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const admin = createAdminClient()

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
    const { data: tokenRow } = await admin
      .from("user_google_calendar_tokens")
      .select("user_id")
      .eq("user_id", targetUserId)
      .single()

    if (tokenRow) {
      const startDt = new Date(due_date)
      const endDt = new Date(startDt.getTime() + 60 * 60 * 1000)
      try {
        const eventId = await createCalendarEvent(targetUserId, {
          summary: `[Tarea CRM] ${title}`,
          description: description || undefined,
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
          await supabase.from("tasks").update({ google_calendar_event_id: eventId }).eq("id", data.id)
        } else {
          calendarSyncFailed = true
        }
      } catch (err) {
        console.error("[calendar] createCalendarEvent failed:", err)
        calendarSyncFailed = true
      }
    }
  }

  return NextResponse.json({ ...data, _calendarSyncFailed: calendarSyncFailed }, { status: 201 })
}
