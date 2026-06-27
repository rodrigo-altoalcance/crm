import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

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

  // Get role — fall back gracefully if query fails
  let role: string | undefined
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    role = profile?.role
  } catch {
    // If we can't determine role, let page-level auth handle it
    return supabaseResponse
  }

  const isAgencyRole = role === "super_admin" || role === "agency_member"

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
