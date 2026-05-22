"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { PermissionsEditor } from "./PermissionsEditor"
import { getDefaultPermissions } from "@/lib/auth/roles"
import type { UserPermissions } from "@/types/database"

interface InviteTeamMemberFormProps {
  companyId: string
  onSuccess: () => void
}

export function InviteTeamMemberForm({ companyId, onSuccess }: InviteTeamMemberFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ full_name: "", email: "" })
  const [permissions, setPermissions] = useState<UserPermissions>(getDefaultPermissions())

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, permissions }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al invitar miembro")
        return
      }
      toast.success(`Invitación enviada a ${form.email}`)
      onSuccess()
    } catch {
      toast.error("Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="inv-name">Nombre completo *</Label>
        <Input
          id="inv-name"
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          placeholder="Ana García"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inv-email">Email *</Label>
        <Input
          id="inv-email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="ana@empresa.com"
          required
        />
      </div>

      <Separator />

      <PermissionsEditor value={permissions} onChange={setPermissions} />

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar invitación"}
        </Button>
      </div>
    </form>
  )
}
