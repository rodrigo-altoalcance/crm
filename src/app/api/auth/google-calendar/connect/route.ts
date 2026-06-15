import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

export async function GET(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const returnTo = searchParams.get("returnTo") || "/dashboard/settings/integrations"

  // Prevent open redirect — only allow relative paths
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : "/dashboard/settings/integrations"

  const nonce = crypto.randomUUID()
  const stateData = JSON.stringify({ nonce, returnTo: safeReturnTo })
  const stateB64 = Buffer.from(stateData).toString("base64url")

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://crm.altoalcance.cl"
  const redirectUri = `${origin}/api/auth/google-calendar/callback`

  const authUrl = new URL(GOOGLE_AUTH_URL)
  authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", SCOPES.join(" "))
  authUrl.searchParams.set("access_type", "offline")
  authUrl.searchParams.set("prompt", "consent") // always request refresh_token
  authUrl.searchParams.set("state", nonce)

  const response = NextResponse.redirect(authUrl.toString())
  response.cookies.set("gcal_oauth_state", stateB64, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })

  return response
}
