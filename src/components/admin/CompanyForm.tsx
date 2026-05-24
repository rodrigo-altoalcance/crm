"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { Company } from "@/types/database"

interface CompanyFormProps {
  company?: Company
}

export function CompanyForm({ company }: CompanyFormProps) {
  const router = useRouter()
  const isEditing = !!company
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: company?.name || "",
    email: company?.email || "",
    phone: company?.phone || "",
    address: company?.address || "",
    website: company?.website || "",
    monthly_fee: company?.monthly_fee?.toString() || "",
    currency: company?.currency || "CLP",
    payment_day: company?.payment_day?.toString() || "",
    max_users: company?.max_users?.toString() || "5",
    status: company?.status || "active",
    org_name: company?.org_name || "",
    org_email: company?.org_email || "",
    org_phone: company?.org_phone || "",
    org_website: company?.org_website || "",
    // user fields — solo al crear
    admin_full_name: "",
    admin_email: "",
    admin_password: "",
    admin_confirm_password: "",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isEditing) {
      if (!form.admin_email) {
        toast.error("El correo del administrador es requerido")
        return
      }
      if (!form.admin_password || form.admin_password.length < 6) {
        toast.error("La contraseña debe tener al menos 6 caracteres")
        return
      }
      if (form.admin_password !== form.admin_confirm_password) {
        toast.error("Las contraseñas no coinciden")
        return
      }
    }

    setLoading(true)

    const companyFields = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      website: form.website,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
      currency: form.currency,
      payment_day: form.payment_day ? parseInt(form.payment_day) : null,
      max_users: parseInt(form.max_users) || 5,
      status: form.status,
      org_name: form.org_name,
      org_email: form.org_email,
      org_phone: form.org_phone,
      org_website: form.org_website,
    }

    const payload = isEditing
      ? companyFields
      : {
          ...companyFields,
          admin_full_name: form.admin_full_name,
          admin_email: form.admin_email,
          admin_password: form.admin_password,
        }

    const res = await fetch(
      isEditing ? `/api/admin/companies/${company.id}` : "/api/admin/companies",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Error al guardar")
      setLoading(false)
      return
    }

    toast.success(isEditing ? "Usuario empresa actualizado" : "Usuario empresa creado. Se envió el correo de bienvenida.")
    router.push("/admin/companies")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Datos de la empresa</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Sitio web</Label>
            <Input id="website" type="url" placeholder="https://" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Plan y pagos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="monthly_fee">Fee mensual</Label>
            <Input id="monthly_fee" type="number" min="0" step="0.01" value={form.monthly_fee} onChange={(e) => set("monthly_fee", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Moneda</Label>
            <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLP">CLP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment_day">Día de cobro mensual</Label>
            <Input id="payment_day" type="number" min="1" max="31" placeholder="Ej: 1, 15, 28" value={form.payment_day} onChange={(e) => set("payment_day", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max_users">Límite de usuarios</Label>
            <Input id="max_users" type="number" min="1" max="100" value={form.max_users} onChange={(e) => set("max_users", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Datos de contacto interno</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="org_name">Nombre organización</Label>
            <Input id="org_name" value={form.org_name} onChange={(e) => set("org_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org_email">Email organización</Label>
            <Input id="org_email" type="email" value={form.org_email} onChange={(e) => set("org_email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org_phone">Teléfono organización</Label>
            <Input id="org_phone" value={form.org_phone} onChange={(e) => set("org_phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org_website">Web organización</Label>
            <Input id="org_website" type="url" placeholder="https://" value={form.org_website} onChange={(e) => set("org_website", e.target.value)} />
          </div>
        </div>
      </div>

      {!isEditing && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-1">Acceso del administrador</h3>
            <p className="text-xs text-slate-400 mb-4">El usuario recibirá un correo para activar su cuenta.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="admin_full_name">Nombre completo</Label>
                <Input
                  id="admin_full_name"
                  placeholder="Juan Pérez"
                  value={form.admin_full_name}
                  onChange={(e) => set("admin_full_name", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="admin_email">Correo electrónico *</Label>
                <Input
                  id="admin_email"
                  type="email"
                  placeholder="admin@empresa.com"
                  value={form.admin_email}
                  onChange={(e) => set("admin_email", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin_password">Contraseña *</Label>
                <Input
                  id="admin_password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={form.admin_password}
                  onChange={(e) => set("admin_password", e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin_confirm_password">Confirmar contraseña *</Label>
                <Input
                  id="admin_confirm_password"
                  type="password"
                  placeholder="Repite la contraseña"
                  value={form.admin_confirm_password}
                  onChange={(e) => set("admin_confirm_password", e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : isEditing ? "Actualizar usuario empresa" : "Crear usuario empresa"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
