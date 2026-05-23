import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { sendEmail } from "@/lib/email/mailer"

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { to } = await request.json()
  if (!to) return NextResponse.json({ error: "El campo 'to' es obligatorio" }, { status: 400 })

  try {
    await sendEmail({
      to,
      subject: "Test de configuración — Alto Alcance CRM",
      html: `
        <p>Si estás viendo esto, el envío de emails está correctamente configurado.</p>
        <p>Remitente: <strong>Alto Alcance CRM &lt;noreply@altoalcance.cl&gt;</strong></p>
        <p>Fecha: ${new Date().toLocaleString("es-CL")}</p>
      `,
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
