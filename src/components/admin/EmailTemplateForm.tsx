"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { EmailTemplate } from "@/types/database"

const VARIABLES = [
  { key: "{{cliente_nombre}}", desc: "Nombre de la empresa cliente" },
  { key: "{{monto}}", desc: "Monto mensual (formateado)" },
  { key: "{{fecha_vencimiento}}", desc: "Fecha del próximo pago" },
  { key: "{{agencia_nombre}}", desc: "Nombre de la agencia" },
  { key: "{{agencia_email}}", desc: "Email de la agencia" },
]

interface EmailTemplateFormProps {
  template?: EmailTemplate
}

export function EmailTemplateForm({ template }: EmailTemplateFormProps) {
  const router = useRouter()
  const isEdit = !!template
  const [name, setName] = useState(template?.name || "")
  const [subject, setSubject] = useState(template?.subject || "")
  const [bodyHtml, setBodyHtml] = useState(template?.body_html || DEFAULT_HTML)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const url = isEdit
        ? `/api/admin/email-templates/${template!.id}`
        : `/api/admin/email-templates`
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, body_html: bodyHtml }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al guardar template")
        return
      }
      toast.success(isEdit ? "Template actualizado" : "Template creado")
      router.push("/admin/settings/emails")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <Label htmlFor="tpl-name">Nombre del template</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Recordatorio de pago"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tpl-subject">Asunto del email</Label>
          <Input
            id="tpl-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Recordatorio de pago - {{agencia_nombre}}"
            required
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Variables disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.desc}
                onClick={() => setBodyHtml((h) => h + v.key)}
                className="group"
              >
                <Badge variant="secondary" className="font-mono cursor-pointer group-hover:bg-indigo-100">
                  {v.key}
                </Badge>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Haz clic en una variable para insertarla al final del HTML</p>
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label htmlFor="tpl-body">Cuerpo HTML</Label>
        <Textarea
          id="tpl-body"
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          rows={20}
          className="font-mono text-sm"
          required
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : isEdit ? "Actualizar template" : "Crear template"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio de pago</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #6366f1; padding: 32px 40px;">
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0;">{{agencia_nombre}}</h1>
      <p style="color: #c7d2fe; font-size: 14px; margin: 4px 0 0;">Recordatorio de pago</p>
    </div>
    <div style="padding: 40px;">
      <p style="color: #1e293b; font-size: 15px; margin: 0 0 24px;">Estimado equipo de <strong>{{cliente_nombre}}</strong>,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Le recordamos que tiene un pago pendiente con nosotros correspondiente al servicio de generación de leads.
      </p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #64748b; font-size: 13px;">Monto</span>
          <span style="color: #1e293b; font-size: 15px; font-weight: 600;">{{monto}}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #64748b; font-size: 13px;">Fecha límite</span>
          <span style="color: #1e293b; font-size: 14px;">{{fecha_vencimiento}}</span>
        </div>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 32px;">
        Ante cualquier consulta, no dude en contactarnos respondiendo este email.
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        {{agencia_nombre}} &mdash; {{agencia_email}}
      </p>
    </div>
  </div>
</body>
</html>`
