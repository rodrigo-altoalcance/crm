import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { SUSPENDED_COMPANY_STATUS, SUSPENDED_COMPANY_MESSAGE } from "@/lib/auth/companyStatus"

const SUSPENDED_PATH = "/cuenta-suspendida"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://crm.altoalcance.cl"

  const { supabase, user, supabaseResponse } = await updateSession(request)

  // Unauthenticated: only allow /login and /api/webhook
  if (!user) {
    if (pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", origin))
    }
    return supabaseResponse
  }

  // Get role + company_id — fall back gracefully if query fails
  let role: string | undefined
  let companyId: string | null | undefined
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single()
    role = profile?.role
    companyId = profile?.company_id
  } catch {
    // If we can't determine role, let page-level auth handle it
    return supabaseResponse
  }

  const isAgencyRole = role === "super_admin" || role === "agency_member"

  // Empresa suspendida: solo bloquea a usuarios reales de esa empresa
  // (company_admin / seller). No bloquea a super_admin/agency_member
  // impersonando — la agencia sigue pudiendo administrar la cuenta.
  let isCompanySuspended = false
  if (!isAgencyRole && companyId) {
    try {
      const { data: company } = await supabase
        .from("companies")
        .select("status")
        .eq("id", companyId)
        .single()
      isCompanySuspended = company?.status === SUSPENDED_COMPANY_STATUS
    } catch {
      // Si falla la consulta, no bloqueamos por falso positivo — el
      // layout/rutas del dashboard igual reintentan el check.
    }
  }

  if (isCompanySuspended && pathname.startsWith("/api/dashboard")) {
    return NextResponse.json({ error: SUSPENDED_COMPANY_MESSAGE }, { status: 403 })
  }

  if (isCompanySuspended && pathname !== SUSPENDED_PATH) {
    if (pathname === "/" || pathname === "/login" || pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL(SUSPENDED_PATH, origin))
    }
  }

  // La empresa ya no está suspendida: no dejar a nadie varado en la pantalla de bloqueo
  if (!isCompanySuspended && pathname === SUSPENDED_PATH) {
    return NextResponse.redirect(new URL(isAgencyRole ? "/admin" : "/dashboard", origin))
  }

  // Root path: redirect based on role
  if (pathname === "/") {
    if (isAgencyRole) return NextResponse.redirect(new URL("/admin", origin))
    return NextResponse.redirect(new URL("/dashboard", origin))
  }

  // Login page: authenticated users should not see it
  if (pathname === "/login") {
    if (isAgencyRole) return NextResponse.redirect(new URL("/admin", origin))
    return NextResponse.redirect(new URL("/dashboard", origin))
  }

  // Payments: only super_admin can access financial pages
  if (pathname.match(/^\/admin\/companies\/[^/]+\/payments/) && role !== "super_admin") {
    return NextResponse.redirect(new URL("/admin", origin))
  }

  // Admin: agency_staff allowed (super_admin + agency_member)
  if (pathname.startsWith("/admin") && !isAgencyRole) {
    return NextResponse.redirect(new URL("/dashboard", origin))
  }

  // Dashboard: agency roles need impersonation cookie
  if (pathname.startsWith("/dashboard") && isAgencyRole) {
    const impersonated = request.cookies.get("impersonated_company")
    if (!impersonated) {
      return NextResponse.redirect(new URL("/admin", origin))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhook).*)",
  ],
}
