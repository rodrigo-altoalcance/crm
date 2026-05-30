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

  const body = await request.json()
  const { stage_id, comment } = body

  if (!comment?.trim()) {
    return NextResponse.json({ error: "El comentario es obligatorio al cambiar etapa" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: stage } = await admin
    .from("lead_stages")
    .select("*")
    .eq("id", stage_id)
    .eq("company_id", companyId)
    .single()

  if (!stage) return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 })

  // Fetch current stage before updating
  const { data: currentLead } = await admin
    .from("leads")
    .select("stage_id, stage:lead_stages(id, name)")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .single()

  const { data: lead, error } = await admin
    .from("leads")
    .update({ stage_id, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("company_id", companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const fromStage = (currentLead?.stage as any)

  await admin.from("lead_activities").insert({
    lead_id: leadId,
    user_id: profile.id,
    type: stage.is_final ? "lead_closed" : "stage_changed",
    description: comment.trim(),
    metadata: {
      from_stage_id: fromStage?.id ?? null,
      from_stage_name: fromStage?.name ?? null,
      to_stage_id: stage.id,
      to_stage_name: stage.name,
      is_final: stage.is_final,
    },
  })

  return NextResponse.json(lead)
}
