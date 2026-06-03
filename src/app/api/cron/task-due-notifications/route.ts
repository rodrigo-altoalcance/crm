import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization")
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()

  const todayChile = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())

  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  let created = 0

  const { data: dueTasks } = await admin
    .from("tasks")
    .select("id, title, assigned_to")
    .eq("due_date", todayChile)
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
    .eq("due_date", todayChile)
    .neq("status", "completed")
    .not("assigned_to", "is", null)

  for (const task of agencyDueTasks || []) {
    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("type", "task_due")
      .eq("user_id", task.assigned_to)
      .gte("created_at", cutoff24h)
      // agency_tasks id can't reference tasks FK, so check by title+user as dedup
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
