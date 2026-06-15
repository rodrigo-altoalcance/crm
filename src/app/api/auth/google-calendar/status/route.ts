import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get("userId") || profile.id

  // Verify authorization to check another user's status
  if (targetUserId !== profile.id) {
    if (profile.role === "super_admin") {
      // Super admins can check any user
    } else {
      // Only allow checking users in the same company
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", targetUserId)
        .single()

      if (!targetProfile || targetProfile.company_id !== profile.company_id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 })
      }
    }
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("user_google_calendar_tokens")
    .select("calendar_id, calendar_name, google_email")
    .eq("user_id", targetUserId)
    .single()

  return NextResponse.json({
    connected: !!data,
    calendarId: data?.calendar_id ?? null,
    calendarName: data?.calendar_name ?? null,
    email: data?.google_email ?? null,
  })
}
