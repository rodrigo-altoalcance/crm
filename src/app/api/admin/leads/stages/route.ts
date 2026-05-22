import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get("company_id")
  if (!companyId) return NextResponse.json([])

  const { data } = await supabase
    .from("lead_stages")
    .select("id, name")
    .eq("company_id", companyId)
    .order("position")

  return NextResponse.json(data || [])
}
