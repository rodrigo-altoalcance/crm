import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { getDefaultPermissions } from "@/lib/auth/roles"

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedId : profile.company_id
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 403 })

  if (profile.role !== "company_admin" && profile.role !== "super_admin") {
    return NextResponse.json({ error: "Solo el admin de empresa puede invitar miembros" }, { status: 403 })
  }

  const { data: company } = await supabase.from("companies").select("max_users").eq("id", companyId).single()
  const { count: currentCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", companyId)

  if (company && currentCount !== null && currentCount >= company.max_users) {
    return NextResponse.json({ error: `Límite de usuarios alcanzado (${company.max_users})` }, { status: 400 })
  }

  const { full_name, email, permissions } = await request.json()
  const admin = createAdminClient()

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: "seller",
      company_id: companyId,
      full_name,
      permissions: JSON.stringify(permissions || getDefaultPermissions()),
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(invited, { status: 201 })
}
