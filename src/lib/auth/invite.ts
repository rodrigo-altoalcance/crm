import { createAdminClient } from "@/lib/supabase/admin"

interface InviteMetadata {
  role: string
  full_name: string
  company_id?: string
  permissions?: string
}

interface InviteLinkResult {
  action_link: string
  user_id: string
}

/**
 * Genera un link de invitación para un usuario nuevo, o un link de recuperación
 * si el usuario ya existe (re-invitación). En el caso de re-invitación también
 * actualiza el perfil para restaurar el acceso a la empresa.
 */
export async function generateInviteLink(
  email: string,
  metadata: InviteMetadata
): Promise<InviteLinkResult> {
  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://crm.altoalcance.cl"
  const redirectTo = `${siteUrl}/activar-cuenta`

  const { data: inviteData, error: inviteError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo, data: metadata },
  })

  if (!inviteError) {
    return { action_link: inviteData.properties.action_link, user_id: inviteData.user.id }
  }

  // Si el usuario ya existe, usar recovery link y restaurar su perfil
  const isExisting =
    inviteError.status === 422 ||
    inviteError.message.toLowerCase().includes("already") ||
    inviteError.message.toLowerCase().includes("registered")

  if (!isExisting) throw new Error(inviteError.message)

  const { data: recoveryData, error: recoveryError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  })

  if (recoveryError) throw new Error(recoveryError.message)

  const userId = recoveryData.user.id

  // Actualizar metadatos del usuario auth
  await admin.auth.admin.updateUserById(userId, { user_metadata: metadata })

  // Restaurar perfil con el nuevo acceso
  if (metadata.company_id) {
    const profileUpdate: Record<string, unknown> = {
      company_id: metadata.company_id,
      role: metadata.role,
      full_name: metadata.full_name,
    }
    if (metadata.permissions) {
      try { profileUpdate.permissions = JSON.parse(metadata.permissions) } catch { /* skip */ }
    }
    await admin.from("profiles").update(profileUpdate).eq("id", userId)
  }

  return { action_link: recoveryData.properties.action_link, user_id: userId }
}
