"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface InviteUserFormProps {
  companyId: string
  onSuccess?: () => void
}

export function InviteUserForm({ companyId, onSuccess }: InviteUserFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "company_admin",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          role: form.role,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al enviar invitación")
        return
      }

      toast.success(`Invitación enviada a ${form.email}. El usuario recibirá un correo para crear su contraseña.`)
      setForm({ full_name: "", email: "", role: "company_admin" })
      onSuccess?.()
    } catch {
      toast.error("Error de red al enviar invitación")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nombre completo *</Label>
        <Input
          id="full_name"
          type="text"
          placeholder="Juan Pérez"
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico *</Label>
        <Input
          id="email"
          type="email"
          placeholder="juan@empresa.com"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role">Rol</Label>
        <Select value={form.role} onValueChange={(v) => set("role", v)}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="company_admin">Administrador de empresa</SelectItem>
            <SelectItem value="seller">Vendedor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-slate-500">
        Se enviará un correo de invitación al usuario para que cree su propia contraseña.
      </p>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Enviando invitación..." : "Enviar invitación"}
        </Button>
      </div>
    </form>
  )
}
