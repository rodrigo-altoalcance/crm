import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  // Verificar que no haya etapas ya
  const { count } = await admin
    .from("lead_stages")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)

  if (count && count > 0) {
    return NextResponse.json({ error: "La empresa ya tiene etapas configuradas" }, { status: 409 })
  }

  const { error } = await admin.rpc("seed_default_stages", { p_company_id: companyId })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
