"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface AdminLeadFormProps {
  companies: { id: string; name: string }[]
}

export function AdminLeadForm({ companies }: AdminLeadFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [stages, setStages] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    company_id: "",
    stage_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    message: "",
    source: "manual" as const,
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  useEffect(() => {
    if (!form.company_id) { setStages([]); return }
    fetch(`/api/admin/leads/stages?company_id=${form.company_id}`)
      .then((r) => r.json())
      .then(setStages)
      .catch(() => setStages([]))
  }, [form.company_id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success("Lead creado")
      router.push("/admin/leads")
    } else {
      toast.error("Error al crear lead")
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Empresa *</Label>
          <Select value={form.company_id} onValueChange={(v) => set("company_id", v)} required>
            <SelectTrigger><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="first_name">Nombre *</Label>
          <Input id="first_name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Apellido *</Label>
          <Input id="last_name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fuente</Label>
          <Select value={form.source} onValueChange={(v) => set("source", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="meta">Meta</SelectItem>
              <SelectItem value="calendly">Calendly</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {stages.length > 0 && (
          <div className="space-y-1.5">
            <Label>Etapa inicial</Label>
            <Select value={form.stage_id} onValueChange={(v) => set("stage_id", v)}>
              <SelectTrigger><SelectValue placeholder="Primera etapa" /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="message">Mensaje</Label>
          <Textarea id="message" rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear lead"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
