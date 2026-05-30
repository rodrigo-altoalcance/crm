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

  // Root path: redirect based on role
  if (pathname === "/") {
    if (role === "super_admin") return NextResponse.redirect(new URL("/admin", origin))
    return NextResponse.redirect(new URL("/dashboard", origin))
  }

  // Login page: authenticated users should not see it
  if (pathname === "/login") {
    if (role === "super_admin") return NextResponse.redirect(new URL("/admin", origin))
    return NextResponse.redirect(new URL("/dashboard", origin))
  }

  // Admin: only super_admin allowed
  if (pathname.startsWith("/admin") && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", origin))
  }

  // Dashboard: super_admin needs impersonation cookie
  if (pathname.startsWith("/dashboard") && role === "super_admin") {
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
