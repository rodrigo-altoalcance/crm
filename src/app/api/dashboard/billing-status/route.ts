import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { computeBillingStatus } from "@/lib/billing"
import { isCompanySuspended, SUSPENDED_COMPANY_MESSAGE } from "@/lib/auth/companyStatus"

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  // Defensa en profundidad — el bloqueo principal ocurre en proxy.ts,
  // pero solo aplica a usuarios reales de la empresa, no a super_admin impersonando.
  if (profile.role !== "super_admin" && (await isCompanySuspended(supabase, companyId))) {
    return NextResponse.json({ error: SUSPENDED_COMPANY_MESSAGE }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("companies")
    .select("next_payment_date")
    .eq("id", companyId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = computeBillingStatus(data?.next_payment_date ?? null)
  return NextResponse.json(result)
}
