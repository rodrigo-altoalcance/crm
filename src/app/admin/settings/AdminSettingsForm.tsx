"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { Mail } from "lucide-react"

interface AdminSettingsFormProps {
  settings: Record<string, string>
}

export function AdminSettingsForm({ settings }: AdminSettingsFormProps) {
  const [form, setForm] = useState({
    agency_name: settings.agency_name || "",
    agency_email: settings.agency_email || "",
    resend_api_key: settings.resend_api_key || "",
  })
  const [loading, setLoading] = useState(false)

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success("Configuración guardada")
    } else {
      toast.error("Error al guardar")
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información de la agencia</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agency_name">Nombre de la agencia</Label>
              <Input id="agency_name" value={form.agency_name} onChange={(e) => set("agency_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agency_email">Email remitente</Label>
              <Input id="agency_email" type="email" placeholder="hola@alto-alcance.com" value={form.agency_email} onChange={(e) => set("agency_email", e.target.value)} />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="resend_api_key">Resend API Key</Label>
              <Input id="resend_api_key" type="password" placeholder="re_..." value={form.resend_api_key} onChange={(e) => set("resend_api_key", e.target.value)} />
              <p className="text-xs text-slate-500">Necesaria para enviar emails de cobranza desde el módulo Clientes</p>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar configuración"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Templates de email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-4">Gestiona los templates de email de cobranza para enviar a las empresas clientes.</p>
          <Button asChild variant="outline">
            <Link href="/admin/settings/emails">
              <Mail className="w-4 h-4" /> Ver templates de email
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
