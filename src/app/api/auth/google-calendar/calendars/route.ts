import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { getValidAccessToken } from "@/lib/google-calendar"

const GOOGLE_CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList"

export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const accessToken = await getValidAccessToken(profile.id)
  if (!accessToken) return NextResponse.json({ error: "No vinculado" }, { status: 401 })

  const res = await fetch(`${GOOGLE_CALENDAR_LIST_URL}?minAccessRole=writer`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    return NextResponse.json({ error: `Google ${res.status}: ${JSON.stringify(errBody)}` }, { status: 502 })
  }

  const data = await res.json()
  const calendars = ((data.items || []) as any[]).map((item) => ({
    id: item.id as string,
    name: item.summary as string,
    primary: (item.primary as boolean) ?? false,
  }))

  return NextResponse.json(calendars)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()
  const { calendar_id, calendar_name } = body

  if (!calendar_id || typeof calendar_id !== "string") {
    return NextResponse.json({ error: "calendar_id requerido" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("user_google_calendar_tokens")
    .update({
      calendar_id,
      calendar_name: calendar_name ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
