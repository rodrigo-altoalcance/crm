import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

function clearStateCookie(response: NextResponse): NextResponse {
  response.cookies.set("gcal_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return response
}

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://crm.altoalcance.cl"
  const fallbackRedirect = `${origin}/dashboard/settings/integrations`

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error || !code || !state) {
    return clearStateCookie(NextResponse.redirect(`${fallbackRedirect}?calendar=error`))
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const storedStateB64 = cookieStore.get("gcal_oauth_state")?.value
  if (!storedStateB64) {
    return NextResponse.redirect(`${fallbackRedirect}?calendar=error`)
  }

  let stateData: { nonce: string; returnTo: string }
  try {
    stateData = JSON.parse(Buffer.from(storedStateB64, "base64url").toString())
  } catch {
    return clearStateCookie(NextResponse.redirect(`${fallbackRedirect}?calendar=error`))
  }

  if (state !== stateData.nonce) {
    return clearStateCookie(NextResponse.redirect(`${fallbackRedirect}?calendar=error`))
  }

  const safeReturnTo = stateData.returnTo.startsWith("/") && !stateData.returnTo.startsWith("//")
    ? stateData.returnTo
    : "/dashboard/settings/integrations"

  const redirectOnError = `${origin}${safeReturnTo}?calendar=error`
  const redirectOnSuccess = `${origin}${safeReturnTo}?calendar=conectado`

  // Auth check
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) {
    return clearStateCookie(NextResponse.redirect(`${origin}/login`))
  }

  // Exchange authorization code for tokens
  const redirectUri = `${origin}/api/auth/google-calendar/callback`
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    return clearStateCookie(NextResponse.redirect(redirectOnError))
  }

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token || !tokenData.refresh_token) {
    return clearStateCookie(NextResponse.redirect(redirectOnError))
  }

  // Fetch user's Google email (best effort)
  let googleEmail: string | null = null
  try {
    const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (userinfoRes.ok) {
      const userinfo = await userinfoRes.json()
      googleEmail = (userinfo.email as string) ?? null
    }
  } catch {
    // Non-critical — continue without email
  }

  const tokenExpiry = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000)
  const admin = createAdminClient()

  await admin.from("user_google_calendar_tokens").upsert(
    {
      user_id: profile.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: tokenExpiry.toISOString(),
      calendar_id: "primary",
      calendar_name: null,
      google_email: googleEmail,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  return clearStateCookie(NextResponse.redirect(redirectOnSuccess))
}
