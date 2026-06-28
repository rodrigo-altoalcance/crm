import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || (profile.role !== "super_admin" && profile.role !== "agency_member")) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { data } = await supabase
    .from("user_lead_column_preferences")
    .select("column_key, visible")
    .eq("user_id", profile.id)
    .eq("context", "company")
    .eq("company_id", companyId)

  const prefs: Record<string, boolean> = {}
  for (const row of data || []) prefs[row.column_key] = row.visible
  return NextResponse.json(prefs)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || (profile.role !== "super_admin" && profile.role !== "agency_member")) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { column_key, visible } = await request.json()
  if (!column_key) return NextResponse.json({ error: "column_key requerido" }, { status: 400 })

  await supabase
    .from("user_lead_column_preferences")
    .delete()
    .eq("user_id", profile.id)
    .eq("context", "company")
    .eq("company_id", companyId)
    .eq("column_key", column_key)

  const { error } = await supabase
    .from("user_lead_column_preferences")
    .insert({ user_id: profile.id, context: "company", company_id: companyId, column_key, visible })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
