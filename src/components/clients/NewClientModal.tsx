"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface NewClientModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  prefill?: {
    companyName?: string
    email?: string
    phone?: string
    adminName?: string
    adminEmail?: string
  }
}

function emptyForm(prefill?: NewClientModalProps["prefill"]) {
  return {
    name: prefill?.companyName || "",
    email: prefill?.email || "",
    phone: prefill?.phone || "",
    address: "",
    website: "",
    monthly_fee: "",
    currency: "CLP",
    payment_day: "",
    max_users: "3",
    status: "active",
    org_name: "",
    org_email: "",
    org_phone: "",
    org_website: "",
    admin_full_name: prefill?.adminName || "",
    admin_email: prefill?.adminEmail || "",
  }
}

export function NewClientModal({ open, onClose, onSuccess, prefill }: NewClientModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(() => emptyForm(prefill))

  useEffect(() => {
    if (open) setForm(emptyForm(prefill))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("El nombre de la empresa es requerido"); return }
    if (!form.admin_email.trim()) { toast.error("El correo del administrador es requerido"); return }

    setLoading(true)
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        website: form.website || null,
        monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
        currency: form.currency,
        payment_day: form.payment_day ? parseInt(form.payment_day) : null,
        max_users: parseInt(form.max_users) || 3,
        status: form.status,
        org_name: form.org_name || null,
        org_email: form.org_email || null,
        org_phone: form.org_phone || null,
        org_website: form.org_website || null,
        admin_full_name: form.admin_full_name,
        admin_email: form.admin_email,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Error al crear el cliente")
      setLoading(false)
      return
    }

    toast.success("Cliente creado y invitación enviada")
    onClose()
    onSuccess?.()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Sección 1: Datos de la empresa */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Datos de la empresa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="nc-name">Nombre empresa *</Label>
                <Input id="nc-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-email">Email de contacto</Label>
                <Input id="nc-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-phone">Teléfono</Label>
                <Input id="nc-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-address">Dirección</Label>
                <Input id="nc-address" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-website">Sitio web</Label>
                <Input id="nc-website" type="url" placeholder="https://" value={form.website} onChange={(e) => set("website", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-fee">Fee mensual</Label>
                <Input id="nc-fee" type="number" min="0" step="0.01" value={form.monthly_fee} onChange={(e) => set("monthly_fee", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-currency">Moneda</Label>
                <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                  <SelectTrigger id="nc-currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLP">CLP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-payment-day">Día de cobro mensual</Label>
                <Input id="nc-payment-day" type="number" min="1" max="31" placeholder="Ej: 1, 15, 28" value={form.payment_day} onChange={(e) => set("payment_day", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-max-users">Límite de usuarios</Label>
                <Input id="nc-max-users" type="number" min="1" max="100" value={form.max_users} onChange={(e) => set("max_users", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-status">Estado</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger id="nc-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-org-name">Nombre organización</Label>
                <Input id="nc-org-name" value={form.org_name} onChange={(e) => set("org_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-org-email">Email organización</Label>
                <Input id="nc-org-email" type="email" value={form.org_email} onChange={(e) => set("org_email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-org-phone">Teléfono organización</Label>
                <Input id="nc-org-phone" value={form.org_phone} onChange={(e) => set("org_phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-org-website">Web organización</Label>
                <Input id="nc-org-website" type="url" placeholder="https://" value={form.org_website} onChange={(e) => set("org_website", e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sección 2: Invitar usuario administrador */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Usuario administrador (obligatorio)
            </h3>
            <p className="text-xs text-slate-400 mb-4">El usuario recibirá un correo de invitación para activar su cuenta.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="nc-admin-name">Nombre completo *</Label>
                <Input
                  id="nc-admin-name"
                  placeholder="Juan Pérez"
                  value={form.admin_full_name}
                  onChange={(e) => set("admin_full_name", e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="nc-admin-email">Correo electrónico *</Label>
                <Input
                  id="nc-admin-email"
                  type="email"
                  placeholder="admin@empresa.com"
                  value={form.admin_email}
                  onChange={(e) => set("admin_email", e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">
                  Rol: <span className="font-medium">Administrador de empresa</span> (no editable)
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear cliente"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
