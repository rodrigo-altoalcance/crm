import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { canViewAllLeads } from "@/lib/auth/roles"

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
  const { title, description, assigned_to, due_date, priority, status } = body

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

  if (assigned_to && assigned_to !== profile.id) {
    const admin = createAdminClient()
    await admin.from("notifications").insert({
      user_id: assigned_to,
      type: "task_assigned",
      title: `Te asignaron una tarea: ${title}`,
      related_task_id: data.id,
    })
  }

  return NextResponse.json(data, { status: 201 })
}
