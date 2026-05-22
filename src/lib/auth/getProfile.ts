import type { SupabaseClient } from "@supabase/supabase-js"
import type { Profile } from "@/types/database"

export async function getProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return data as Profile | null
}
