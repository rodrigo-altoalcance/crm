import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || (profile.role !== "super_admin" && profile.role !== "agency_member")) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { data } = await supabase
    .from("user_lead_column_preferences")
    .select("column_key, visible")
    .eq("user_id", profile.id)
    .eq("context", "agency")
    .is("company_id", null)

  const prefs: Record<string, boolean> = {}
  for (const row of data || []) prefs[row.column_key] = row.visible
  return NextResponse.json(prefs)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || (profile.role !== "super_admin" && profile.role !== "agency_member")) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { column_key, visible } = await request.json()
  if (!column_key) return NextResponse.json({ error: "column_key requerido" }, { status: 400 })

  await supabase
    .from("user_lead_column_preferences")
    .delete()
    .eq("user_id", profile.id)
    .eq("context", "agency")
    .is("company_id", null)
    .eq("column_key", column_key)

  const { error } = await supabase
    .from("user_lead_column_preferences")
    .insert({ user_id: profile.id, context: "agency", company_id: null, column_key, visible })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
