import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { Resend } from "resend"
import { formatCLP } from "@/lib/utils"
import { formatDate } from "@/lib/utils"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { template_id } = await request.json()

  const [{ data: company }, { data: template }, { data: settings }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).single(),
    supabase.from("email_templates").select("*").eq("id", template_id).single(),
    supabase.from("crm_settings").select("*"),
  ])

  if (!company || !template) {
    return NextResponse.json({ error: "Empresa o template no encontrado" }, { status: 404 })
  }

  const settingsMap = Object.fromEntries((settings || []).map((s: any) => [s.key, s.value]))
  const apiKey = settingsMap.resend_api_key
  const agencyEmail = settingsMap.agency_email || "noreply@alto-alcance.com"
  const agencyName = settingsMap.agency_name || "Alto Alcance"

  if (!apiKey) {
    return NextResponse.json({ error: "Resend API Key no configurada en Ajustes" }, { status: 400 })
  }

  const nextPaymentDate = company.next_payment_date
    ? formatDate(company.next_payment_date)
    : "—"

  const html = template.body_html
    .replace(/\{\{cliente_nombre\}\}/g, company.name)
    .replace(/\{\{monto\}\}/g, company.monthly_fee ? formatCLP(company.monthly_fee) : "—")
    .replace(/\{\{fecha_vencimiento\}\}/g, nextPaymentDate)
    .replace(/\{\{agencia_nombre\}\}/g, agencyName)
    .replace(/\{\{agencia_email\}\}/g, agencyEmail)

  const subject = template.subject
    .replace(/\{\{agencia_nombre\}\}/g, agencyName)
    .replace(/\{\{cliente_nombre\}\}/g, company.name)

  const resend = new Resend(apiKey)
  const emailTo = company.email || company.org_email

  if (!emailTo) {
    return NextResponse.json({ error: "La empresa no tiene email configurado" }, { status: 400 })
  }

  const { error } = await resend.emails.send({
    from: `${agencyName} <${agencyEmail}>`,
    to: emailTo,
    subject,
    html,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
