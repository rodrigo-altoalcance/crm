import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data, error } = await supabase
    .from("task_comments")
    .select("*, profile:profiles(full_name, avatar_url)")
    .eq("task_id", id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // Verify task belongs to this company (super_admin without impersonation can access any task)
  let taskQuery = supabase.from("tasks").select("id").eq("id", id)
  if (companyId) taskQuery = taskQuery.eq("company_id", companyId)
  const { data: task } = await taskQuery.single()
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })

  const { text } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 400 })

  const { data, error } = await supabase
    .from("task_comments")
    .insert({ task_id: id, user_id: profile.id, text: text.trim() })
    .select("*, profile:profiles(full_name, avatar_url)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
