import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
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
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  // Verify task belongs to this company
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", id)
    .eq("company_id", companyId)
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

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select("*, assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
