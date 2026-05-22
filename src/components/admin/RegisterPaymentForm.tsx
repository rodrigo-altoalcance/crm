"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface RegisterPaymentFormProps {
  companyId: string
  onSuccess: () => void
}

export function RegisterPaymentForm({ companyId, onSuccess }: RegisterPaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    amount: "",
    currency: "CLP",
    paid_at: new Date().toISOString().slice(0, 10),
    notes: "",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("El monto debe ser mayor a 0")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          currency: form.currency,
          paid_at: form.paid_at,
          notes: form.notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al registrar pago")
        return
      }

      toast.success("Pago registrado correctamente")
      onSuccess()
    } catch {
      toast.error("Error de red al registrar pago")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Monto *</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            required
          />
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
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="paid_at">Fecha de pago *</Label>
        <Input
          id="paid_at"
          type="date"
          value={form.paid_at}
          onChange={(e) => set("paid_at", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          placeholder="Observaciones opcionales..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Registrando..." : "Registrar pago"}
        </Button>
      </div>
    </form>
  )
}
