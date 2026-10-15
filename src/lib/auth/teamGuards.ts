import type { SupabaseClient } from "@supabase/supabase-js"

const PERMANENT_BAN_DURATION = "876000h"

async function getBannedMap(admin: SupabaseClient, userIds: string[]): Promise<Map<string, boolean>> {
  const bannedMap = new Map<string, boolean>()
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  for (const user of data?.users || []) {
    if (!userIds.includes(user.id)) continue
    const bannedUntil = (user as { banned_until?: string | null }).banned_until
    const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()
    bannedMap.set(user.id, isBanned)
  }
  return bannedMap
}

/**
 * True si targetUserId es el único super_admin que quedaría activo (no baneado)
 * después de desactivarlo/eliminarlo.
 */
export async function isLastActiveSuperAdmin(admin: SupabaseClient, targetUserId: string): Promise<boolean> {
  const { data: superAdmins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "super_admin")

  const ids = (superAdmins || []).map((p) => p.id as string)
  if (!ids.includes(targetUserId)) return false

  const bannedMap = await getBannedMap(admin, ids)
  const activeOthers = ids.filter((id) => id !== targetUserId && !bannedMap.get(id))
  return activeOthers.length === 0
}

export async function setUserBanned(admin: SupabaseClient, userId: string, banned: boolean) {
  return admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? PERMANENT_BAN_DURATION : "none",
  })
}

export function isUserActive(user: { banned_until?: string | null } | null | undefined): boolean {
  if (!user?.banned_until) return true
  return new Date(user.banned_until) <= new Date()
}
