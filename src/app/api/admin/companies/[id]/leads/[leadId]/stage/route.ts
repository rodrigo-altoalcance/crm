import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const { id: companyId, leadId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { stage_id } = await request.json()
  const admin = createAdminClient()

  const { data: stage } = await admin
    .from("lead_stages")
    .select("*")
    .eq("id", stage_id)
    .single()

  if (!stage) return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 })

  const { data: lead, error } = await admin
    .from("leads")
    .update({ stage_id, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("company_id", companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const activityType = stage.is_final ? "lead_closed" : "stage_changed"
  const description = stage.is_final
    ? `Lead cerrado — movido a ${stage.name} por ${profile.full_name} (admin)`
    : `Etapa cambiada a "${stage.name}" por ${profile.full_name} (admin)`

  await admin.from("lead_activities").insert({
    lead_id: leadId,
    user_id: profile.id,
    type: activityType,
    description,
    metadata: { stage_name: stage.name, is_final: stage.is_final },
  })

  return NextResponse.json(lead)
}
