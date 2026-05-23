import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { createServerClient } from "@supabase/ssr"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const { supabase, user, supabaseResponse } = await updateSession(request)

  if (!user) {
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return supabaseResponse
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role

  if (pathname.startsWith("/admin") && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (pathname.startsWith("/dashboard") && role === "super_admin") {
    const impersonated = request.cookies.get("impersonated_company")
    if (!impersonated) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
  }

  if (pathname === "/login" && user) {
    if (role === "super_admin") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhook).*)",
  ],
}
