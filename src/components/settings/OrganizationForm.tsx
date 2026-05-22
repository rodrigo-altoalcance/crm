"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface OrgData {
  org_name: string
  org_email: string
  org_phone: string
  org_website: string
}

interface OrganizationFormProps {
  initialData: OrgData
}

export function OrganizationForm({ initialData }: OrganizationFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<OrgData>(initialData)

  function set(key: keyof OrgData, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al guardar")
        return
      }
      toast.success("Organización actualizada")
    } catch {
      toast.error("Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org_name">Nombre de la organización</Label>
            <Input
              id="org_name"
              value={form.org_name}
              onChange={(e) => set("org_name", e.target.value)}
              placeholder="Mi Empresa S.A."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org_email">Email de contacto</Label>
            <Input
              id="org_email"
              type="email"
              value={form.org_email}
              onChange={(e) => set("org_email", e.target.value)}
              placeholder="contacto@empresa.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org_phone">Teléfono</Label>
            <Input
              id="org_phone"
              type="tel"
              value={form.org_phone}
              onChange={(e) => set("org_phone", e.target.value)}
              placeholder="+56 2 1234 5678"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org_website">Sitio web</Label>
            <Input
              id="org_website"
              type="url"
              value={form.org_website}
              onChange={(e) => set("org_website", e.target.value)}
              placeholder="https://empresa.com"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
