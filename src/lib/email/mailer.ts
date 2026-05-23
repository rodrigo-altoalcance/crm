import { Resend } from "resend"

const FROM = "Alto Alcance CRM <noreply@altoalcance.cl>"

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY no está configurada en las variables de entorno")
  return new Resend(key)
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const resend = getResend()
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(error.message)
  return data
}
