import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

const AGENCY_KEYS = ["agency_name", "agency_address", "agency_phone", "agency_website", "agency_logo_url"]

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin" && profile.role !== "agency_member") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("crm_settings")
    .select("key, value")
    .in("key", AGENCY_KEYS)

  const result = Object.fromEntries((data || []).map((s) => [s.key, s.value]))
  return NextResponse.json(result)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await request.json()
  const admin = createAdminClient()

  const upserts = Object.entries(body)
    .filter(([key]) => AGENCY_KEYS.includes(key))
    .map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }))

  const { error } = await admin.from("crm_settings").upsert(upserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from("admin_audit_log").insert({
    user_id: profile.id,
    user_name: profile.full_name,
    action: "Configuración de organización guardada",
    section: "organization",
    details: body,
  })

  return NextResponse.json({ success: true })
}
