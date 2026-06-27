import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ companyId: string; activityId: string }> }
) {
  const { companyId, activityId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  // Verify activity belongs to this company (anti-IDOR)
  const { data: activity } = await admin
    .from("agency_client_activities")
    .select("id")
    .eq("id", activityId)
    .eq("company_id", companyId)
    .single()

  if (!activity) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 })

  const { error } = await admin.from("agency_client_activities").delete().eq("id", activityId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
