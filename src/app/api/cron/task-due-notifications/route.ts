import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Returns the UTC start and end of "today" in America/Santiago timezone
function getSantiagoTodayRangeUTC(): { start: string; end: string } {
  const now = new Date()

  // Parse current Santiago date/time from Intl
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Santiago",
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value)
  const year = get("year")
  const month = get("month") - 1 // 0-indexed
  const day = get("day")
  const hour = get("hour")
  const minute = get("minute")
  const second = get("second")

  // Derive the UTC → Santiago offset by comparing UTC now with its Santiago representation
  const santiagoNow = new Date(year, month, day, hour, minute, second)
  const offsetMs = now.getTime() - santiagoNow.getTime()

  // Midnight today and tomorrow in Santiago, converted to UTC
  const startSantiago = new Date(year, month, day, 0, 0, 0)
  const endSantiago = new Date(year, month, day + 1, 0, 0, 0)

  return {
    start: new Date(startSantiago.getTime() + offsetMs).toISOString(),
    end: new Date(endSantiago.getTime() + offsetMs).toISOString(),
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization")
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { start, end } = getSantiagoTodayRangeUTC()
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  let created = 0

  const { data: dueTasks } = await admin
    .from("tasks")
    .select("id, title, assigned_to")
    .gte("due_date", start)
    .lt("due_date", end)
    .neq("status", "completed")
    .not("assigned_to", "is", null)

  for (const task of dueTasks || []) {
    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("type", "task_due")
      .eq("related_task_id", task.id)
      .eq("user_id", task.assigned_to)
      .gte("created_at", cutoff24h)

    if (!count || count === 0) {
      await admin.from("notifications").insert({
        user_id: task.assigned_to,
        type: "task_due",
        title: `Tarea pendiente hoy: ${task.title}`,
        related_task_id: task.id,
      })
      created++
    }
  }

  const { data: agencyDueTasks } = await admin
    .from("agency_tasks")
    .select("id, title, assigned_to")
    .gte("due_date", start)
    .lt("due_date", end)
    .neq("status", "completed")
    .not("assigned_to", "is", null)

  for (const task of agencyDueTasks || []) {
    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("type", "task_due")
      .eq("user_id", task.assigned_to)
      .gte("created_at", cutoff24h)
      .eq("title", `Tarea pendiente hoy: ${task.title}`)

    if (!count || count === 0) {
      await admin.from("notifications").insert({
        user_id: task.assigned_to,
        type: "task_due",
        title: `Tarea pendiente hoy: ${task.title}`,
      })
      created++
    }
  }

  return NextResponse.json({ ok: true, created })
}
