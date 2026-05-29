import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

async function getCtx() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return { error: "No autorizado", status: 401, supabase, profile: null, companyId: null }
  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return { error: "No company", status: 403, supabase, profile, companyId: null }
  return { error: null, status: 200, supabase, profile, companyId }
}

export async function GET() {
  const { error, status, supabase, profile, companyId } = await getCtx()
  if (error || !profile || !companyId) return NextResponse.json({ error }, { status })

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

export async function PATCH(request: Request) {
  const { error, status, supabase, profile, companyId } = await getCtx()
  if (error || !profile || !companyId) return NextResponse.json({ error }, { status })

  const { column_key, visible } = await request.json()
  if (!column_key) return NextResponse.json({ error: "column_key requerido" }, { status: 400 })

  await supabase
    .from("user_lead_column_preferences")
    .delete()
    .eq("user_id", profile.id)
    .eq("context", "company")
    .eq("company_id", companyId)
    .eq("column_key", column_key)

  const { error: dbError } = await supabase
    .from("user_lead_column_preferences")
    .insert({ user_id: profile.id, context: "company", company_id: companyId, column_key, visible })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
