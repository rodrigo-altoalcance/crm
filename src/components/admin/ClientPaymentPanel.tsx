"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { formatCLP, formatDate } from "@/lib/utils"
import { Plus } from "lucide-react"
import type { Company, Payment } from "@/types/database"

interface ClientPaymentPanelProps {
  company: Company
  payments: Payment[]
}

export function ClientPaymentPanel({ company, payments }: ClientPaymentPanelProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    amount: company.monthly_fee?.toString() || "",
    currency: company.currency || "CLP",
    paid_at: new Date().toISOString().split("T")[0],
    notes: "",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/admin/companies/${company.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    })
    if (res.ok) {
      toast.success("Pago registrado")
      setShowForm(false)
      router.refresh()
    } else {
      toast.error("Error al registrar pago")
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-slate-500">Fee mensual</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {company.monthly_fee ? formatCLP(company.monthly_fee) : "—"}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-slate-500">Día de cobro</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {company.payment_day ? `Día ${company.payment_day}` : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Historial de pagos</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> Registrar pago
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-lg p-4 space-y-3 border">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Monto *</Label>
              <Input id="amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLP">CLP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="paid_at">Fecha de pago *</Label>
            <Input id="paid_at" type="date" value={form.paid_at} onChange={(e) => set("paid_at", e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>{loading ? "Guardando..." : "Registrar"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {payments.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">No hay pagos registrados</p>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{formatDate(p.paid_at)}</p>
                {p.notes && <p className="text-xs text-slate-500">{p.notes}</p>}
              </div>
              <Badge variant="success">{formatCLP(p.amount)}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
