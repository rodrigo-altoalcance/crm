import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function POST(request: Request) {
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { company_id } = await request.json()

  if (!company_id) {
    return NextResponse.json({ error: "company_id es requerido" }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set("impersonated_company", company_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })

  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || (profile.role !== "super_admin" && profile.role !== "agency_member")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.delete("impersonated_company")

  return NextResponse.redirect(new URL("/admin/companies", process.env.NEXT_PUBLIC_SITE_URL || "https://crm.altoalcance.cl"))
}
