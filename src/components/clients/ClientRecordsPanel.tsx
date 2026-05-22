"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Calendar as CalendarIcon, HandshakeIcon } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { ClientRecord, RecordType } from "@/types/database"

const typeLabels: Record<RecordType, string> = {
  note: "Nota",
  meeting: "Reunión",
  agreement: "Acuerdo",
  other: "Otro",
}

const typeVariants: Record<RecordType, "secondary" | "info" | "success" | "warning"> = {
  note: "secondary",
  meeting: "info",
  agreement: "success",
  other: "warning",
}

interface ClientRecordsPanelProps {
  leadId: string
  companyId: string
  records: ClientRecord[]
}

export function ClientRecordsPanel({ leadId, companyId, records: initialRecords }: ClientRecordsPanelProps) {
  const router = useRouter()
  const [records, setRecords] = useState<ClientRecord[]>(initialRecords)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "note" as RecordType,
    record_date: "",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${leadId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          record_date: form.record_date || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al crear registro")
        return
      }
      const newRecord = await res.json()
      setRecords((prev) => [newRecord, ...prev])
      setForm({ title: "", description: "", type: "note", record_date: "" })
      setShowForm(false)
      toast.success("Registro creado")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Registros ({records.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> Agregar registro
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 bg-slate-50 rounded-xl p-4 border">
            <div className="space-y-1.5">
              <Label htmlFor="record-title">Título *</Label>
              <Input
                id="record-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Título del registro"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Nota</SelectItem>
                    <SelectItem value="meeting">Reunión</SelectItem>
                    <SelectItem value="agreement">Acuerdo</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="record-date">Fecha</Label>
                <Input
                  id="record-date"
                  type="date"
                  value={form.record_date}
                  onChange={(e) => set("record_date", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="record-description">Descripción</Label>
              <Textarea
                id="record-description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Detalles del registro..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {records.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 text-center py-8">
            No hay registros aún. Agrega el primero.
          </p>
        )}

        <div className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-slate-900 text-sm">{record.title}</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={typeVariants[record.type]}>{typeLabels[record.type]}</Badge>
                  {record.record_date && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <CalendarIcon className="w-3 h-3" />
                      {formatDate(record.record_date)}
                    </span>
                  )}
                </div>
              </div>
              {record.description && (
                <p className="text-sm text-slate-600">{record.description}</p>
              )}
              <p className="text-xs text-slate-400 mt-2">
                {formatDate(record.created_at)}
                {record.profile && ` · ${record.profile.full_name}`}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
