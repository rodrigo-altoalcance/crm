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
    password: "",
    confirm_password: "",
    role: "company_admin",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.password !== form.confirm_password) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    if (form.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al crear usuario")
        return
      }

      toast.success(`Usuario creado. Se envió el correo de bienvenida a ${form.email}`)
      setForm({ full_name: "", email: "", password: "", confirm_password: "", role: "company_admin" })
    } catch {
      toast.error("Error de red al crear usuario")
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
        <Label htmlFor="password">Contraseña *</Label>
        <Input
          id="password"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          required
          minLength={6}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm_password">Confirmar contraseña *</Label>
        <Input
          id="confirm_password"
          type="password"
          placeholder="Repite la contraseña"
          value={form.confirm_password}
          onChange={(e) => set("confirm_password", e.target.value)}
          required
          minLength={6}
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

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creando usuario..." : "Crear usuario empresa"}
        </Button>
      </div>
    </form>
  )
}
