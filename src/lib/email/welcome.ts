import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/mailer"

export async function sendWelcomeEmail({
  to,
  companyName,
  verificationLink,
}: {
  to: string
  companyName: string
  verificationLink: string
}) {
  const supabase = createAdminClient()
  const { data: template } = await supabase
    .from("email_templates")
    .select("subject, body_html")
    .eq("type", "welcome")
    .eq("is_default", true)
    .single()

  if (!template) {
    throw new Error("No se encontró el template de bienvenida. Ejecútalo desde /admin/settings/emails.")
  }

  function replaceVars(text: string) {
    return text
      .replaceAll("{{nombre_empresa}}", companyName)
      .replaceAll("{{email}}", to)
      .replaceAll("{{link_verificacion}}", verificationLink)
  }

  await sendEmail({
    to,
    subject: replaceVars(template.subject),
    html: replaceVars(template.body_html),
  })
}
