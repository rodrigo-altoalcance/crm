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
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...form,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
      payment_day: form.payment_day ? parseInt(form.payment_day) : null,
      max_users: parseInt(form.max_users) || 5,
    }

    const res = await fetch(
      company ? `/api/admin/companies/${company.id}` : "/api/admin/companies",
      {
        method: company ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )

    if (!res.ok) {
      toast.error("Error al guardar empresa")
      setLoading(false)
      return
    }

    toast.success(company ? "Empresa actualizada" : "Empresa creada")
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

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : company ? "Actualizar empresa" : "Crear empresa"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
