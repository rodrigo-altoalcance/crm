import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: webhookToken } = await supabase
    .from("agency_webhook_tokens")
    .select("*")
    .eq("token", token)
    .single()

  if (!webhookToken) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 })
  }

  const fieldMapping: Record<string, string> = webhookToken.field_mapping || {}

  let rawBody: Record<string, unknown>
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const mapped: Record<string, string> = {}
  const customFields: Record<string, string> = {}

  for (const [incomingKey, incomingValue] of Object.entries(rawBody)) {
    const crmField = fieldMapping[incomingKey]
    if (crmField) {
      if (crmField.startsWith("custom:")) {
        customFields[crmField.replace("custom:", "")] = String(incomingValue)
      } else {
        mapped[crmField] = String(incomingValue)
      }
    } else {
      mapped[incomingKey] = String(incomingValue)
    }
  }

  const firstName = mapped.first_name || mapped.nombre || ""
  const lastName = mapped.last_name || mapped.apellido || ""
  const email = mapped.email || mapped.correo || ""
  const phone = mapped.phone || mapped.telefono || mapped.fono || ""
  const message = mapped.message || mapped.mensaje || ""
  const source = mapped.source || mapped.origen || "meta"

  if (!customFields.empresa && (mapped.empresa || rawBody.empresa)) {
    customFields.empresa = String(mapped.empresa || rawBody.empresa || "")
  }
  if (!customFields.fecha_agenda && (mapped.fecha_agenda || rawBody.fecha_agenda)) {
    customFields.fecha_agenda = String(mapped.fecha_agenda || rawBody.fecha_agenda || "")
  }
  if (!customFields.fecha_registro && (mapped.fecha_registro || rawBody.fecha_registro)) {
    customFields.fecha_registro = String(mapped.fecha_registro || rawBody.fecha_registro || "")
  }

  if (!email && !firstName) {
    return NextResponse.json({ error: "Se requiere email o nombre" }, { status: 400 })
  }

  const { data: firstStage } = await supabase
    .from("agency_stages")
    .select("id")
    .order("position", { ascending: true })
    .limit(1)
    .single()

  const { data: lead, error } = await supabase
    .from("agency_leads")
    .insert({
      stage_id: firstStage?.id || null,
      first_name: firstName,
      last_name: lastName,
      email: email || `noemail+${Date.now()}@placeholder.com`,
      phone: phone || null,
      message: message || null,
      source,
      custom_fields: customFields,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, lead_id: lead.id }, { status: 201 })
}
