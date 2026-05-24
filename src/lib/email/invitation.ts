import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/mailer"

export async function sendInvitationEmail({
  to,
  inviteeName,
  companyName,
  inviteLink,
}: {
  to: string
  inviteeName: string
  companyName: string
  inviteLink: string
}) {
  const supabase = createAdminClient()
  const { data: template } = await supabase
    .from("email_templates")
    .select("subject, body_html")
    .eq("type", "invitation")
    .eq("is_default", true)
    .single()

  if (!template) {
    throw new Error("No se encontró el template de invitación. Ejecuta la migración 005_invitation_email_template.sql.")
  }

  function replaceVars(text: string) {
    return text
      .replaceAll("{{nombre_invitado}}", inviteeName)
      .replaceAll("{{nombre_empresa}}", companyName)
      .replaceAll("{{link_invitacion}}", inviteLink)
  }

  await sendEmail({
    to,
    subject: replaceVars(template.subject),
    html: replaceVars(template.body_html),
  })
}
