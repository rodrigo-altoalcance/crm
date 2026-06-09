import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { toSnakeCase } from "@/lib/utils"
import { z } from "zod"

const payloadSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
  source: z.enum(["meta", "calendly", "manual"]).optional(),
}).passthrough()

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: webhookToken } = await supabase
    .from("webhook_tokens")
    .select("*")
    .eq("token", token)
    .single()

  if (!webhookToken) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 })
  }

  const companyId = webhookToken.company_id
  const fieldMapping: Record<string, string> = webhookToken.field_mapping || {}

  let rawBody: Record<string, unknown>
  try {
    const json = await request.json()
    const result = payloadSchema.safeParse(json)
    if (!result.success) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }
    rawBody = result.data
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
  const source = (mapped.source || mapped.origen || "meta") as "meta" | "calendly" | "manual"

  // Auto-extract special fields into custom_fields if not already mapped
  if (!customFields.empresa && (mapped.empresa || rawBody.empresa)) {
    customFields.empresa = String(mapped.empresa || rawBody.empresa || "")
  }
  if (!customFields.fecha_agenda && (mapped.fecha_agenda || rawBody.fecha_agenda)) {
    customFields.fecha_agenda = String(mapped.fecha_agenda || rawBody.fecha_agenda || "")
  }
  if (!customFields.fecha_registro && (mapped.fecha_registro || rawBody.fecha_registro)) {
    customFields.fecha_registro = String(mapped.fecha_registro || rawBody.fecha_registro || "")
  }

  // Parse fecha_agenda → scheduled_at so it appears in the lead detail UI
  let scheduledAt: string | null = null
  if (customFields.fecha_agenda) {
    const d = new Date(customFields.fecha_agenda)
    if (!isNaN(d.getTime())) scheduledAt = d.toISOString()
  }

  if (!email && !firstName) {
    return NextResponse.json({ error: "Se requiere email o nombre" }, { status: 400 })
  }

  const { data: firstStage } = await supabase
    .from("lead_stages")
    .select("id")
    .eq("company_id", companyId)
    .order("position", { ascending: true })
    .limit(1)
    .single()

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      company_id: companyId,
      stage_id: firstStage?.id,
      first_name: firstName,
      last_name: lastName,
      email: email || `noemail+${Date.now()}@placeholder.com`,
      phone: phone || null,
      message: message || null,
      source: ["meta", "calendly", "manual"].includes(source) ? source : "meta",
      custom_fields: customFields,
      scheduled_at: scheduledAt,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    type: "lead_created",
    description: `Lead recibido via webhook (${source})`,
    metadata: { webhook_token_id: webhookToken.id, source },
  })

  // Guardar valores de campos personalizados
  const { data: customFieldDefs } = await supabase
    .from("custom_lead_fields")
    .select("id, nombre")
    .eq("context", "company")
    .eq("company_id", companyId)
    .order("orden")

  if (customFieldDefs && customFieldDefs.length > 0) {
    const valuesToInsert = customFieldDefs
      .map((def) => ({ def, key: toSnakeCase(def.nombre) }))
      .filter(({ key }) => key && rawBody[key] !== undefined && rawBody[key] !== null && rawBody[key] !== "")
      .map(({ def, key }) => ({ field_id: def.id, lead_id: lead.id, valor: String(rawBody[key]) }))
    if (valuesToInsert.length > 0) {
      await supabase.from("custom_lead_field_values").insert(valuesToInsert)
    }
  }

  return NextResponse.json({ success: true, lead_id: lead.id }, { status: 201 })
}
