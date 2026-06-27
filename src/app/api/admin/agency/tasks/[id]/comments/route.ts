import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("agency_task_comments")
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
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  // Verify task exists
  const admin = createAdminClient()
  const { data: task } = await admin.from("agency_tasks").select("id").eq("id", id).single()
  if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })

  const { text } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 400 })

  const { data, error } = await admin
    .from("agency_task_comments")
    .insert({ task_id: id, user_id: profile.id, text: text.trim() })
    .select("*, profile:profiles(full_name, avatar_url)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
