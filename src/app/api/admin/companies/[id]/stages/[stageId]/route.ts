import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  const { id: companyId, stageId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { name, color, position, is_final, is_lost } = body
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("lead_stages")
    .update({ name, color, position, is_final, is_lost })
    .eq("id", stageId)
    .eq("company_id", companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  const { id: companyId, stageId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  const { count } = await admin
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("stage_id", stageId)
    .eq("company_id", companyId)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: hay ${count} lead(s) en esta etapa` },
      { status: 409 }
    )
  }

  const { error } = await admin
    .from("lead_stages")
    .delete()
    .eq("id", stageId)
    .eq("company_id", companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
