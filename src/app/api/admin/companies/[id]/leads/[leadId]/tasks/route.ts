import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const { id: companyId, leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tasks")
    .select("*, assigned_profile:profiles!assigned_to(full_name)")
    .eq("lead_id", leadId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const { id: companyId, leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { title, description, assigned_to, due_date, priority } = await request.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("tasks")
    .insert({
      company_id: companyId,
      lead_id: leadId,
      title,
      description: description || null,
      assigned_to: assigned_to || null,
      due_date: due_date || null,
      priority: priority || "medium",
      status: "pending",
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
