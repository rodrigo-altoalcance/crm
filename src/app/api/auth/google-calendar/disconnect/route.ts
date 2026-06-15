import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"

export async function DELETE() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()

  // Retrieve refresh_token before deleting so we can revoke it with Google
  const { data: tokenRow } = await admin
    .from("user_google_calendar_tokens")
    .select("refresh_token")
    .eq("user_id", profile.id)
    .single()

  // Delete from DB regardless of revocation outcome
  await admin.from("user_google_calendar_tokens").delete().eq("user_id", profile.id)

  // Revoke with Google (best effort — don't block the response on failure)
  if (tokenRow?.refresh_token) {
    fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(tokenRow.refresh_token)}`, {
      method: "POST",
    }).catch(() => undefined)
  }

  return NextResponse.json({ success: true })
}
