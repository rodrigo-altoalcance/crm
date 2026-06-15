import { createAdminClient } from "@/lib/supabase/admin"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("user_google_calendar_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", userId)
    .single()

  if (!data) return null

  const expiresAt = new Date(data.token_expiry)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt > fiveMinutesFromNow) {
    return data.access_token
  }

  // Token is expiring soon — refresh it
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) return null
  const refreshed = await res.json()
  if (!refreshed.access_token) return null

  const newExpiry = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000)
  await admin
    .from("user_google_calendar_tokens")
    .update({
      access_token: refreshed.access_token,
      token_expiry: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  return refreshed.access_token
}

async function getCalendarId(userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("user_google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", userId)
    .single()
  return data?.calendar_id || "primary"
}

export interface CalendarEventInput {
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  reminders?: {
    useDefault: boolean
    overrides?: { method: string; minutes: number }[]
  }
}

export async function createCalendarEvent(
  userId: string,
  event: CalendarEventInput
): Promise<string | null> {
  const [accessToken, calendarId] = await Promise.all([
    getValidAccessToken(userId),
    getCalendarId(userId),
  ])
  if (!accessToken) return null

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  )

  if (!res.ok) return null
  const data = await res.json()
  return (data.id as string) ?? null
}

export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const [accessToken, calendarId] = await Promise.all([
    getValidAccessToken(userId),
    getCalendarId(userId),
  ])
  if (!accessToken) return false

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  return res.ok || res.status === 404
}

export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  patch: Partial<CalendarEventInput>
): Promise<boolean> {
  const [accessToken, calendarId] = await Promise.all([
    getValidAccessToken(userId),
    getCalendarId(userId),
  ])
  if (!accessToken) return false

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    }
  )

  return res.ok
}
