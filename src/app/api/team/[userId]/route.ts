import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id

  if (profile.role !== "company_admin" && profile.role !== "super_admin") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const { permissions } = await request.json()

  const { data, error } = await supabase
    .from("profiles")
    .update({ permissions })
    .eq("id", userId)
    .eq("company_id", companyId!)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (profile.role !== "company_admin" && profile.role !== "super_admin") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const { error } = await supabase
    .from("profiles")
    .update({ company_id: null })
    .eq("id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
