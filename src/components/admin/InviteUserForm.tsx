"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface InviteUserFormProps {
  companyId: string
}

export function InviteUserForm({ companyId }: InviteUserFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "seller",
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
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al invitar usuario")
        return
      }

      toast.success(`Invitación enviada a ${form.email}`)
      setForm({ full_name: "", email: "", role: "seller" })
    } catch {
      toast.error("Error de red al invitar usuario")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="juan@empresa.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </div>
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

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Enviando invitación..." : "Invitar usuario"}
        </Button>
      </div>
    </form>
  )
}
