"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"

const CRM_FIELDS = [
  { value: "first_name", label: "Nombre" },
  { value: "last_name", label: "Apellido" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Teléfono" },
  { value: "message", label: "Mensaje" },
  { value: "source", label: "Fuente" },
]

interface FieldMappingEditorProps {
  tokenId: string
  initialMapping: Record<string, string>
  onSave?: (mapping: Record<string, string>) => void
}

type MappingRow = { key: string; value: string }

export function FieldMappingEditor({ tokenId, initialMapping, onSave }: FieldMappingEditorProps) {
  const [rows, setRows] = useState<MappingRow[]>(
    Object.entries(initialMapping).map(([key, value]) => ({ key, value }))
  )
  const [loading, setLoading] = useState(false)

  function addRow() {
    setRows((r) => [...r, { key: "", value: "" }])
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: "key" | "value", val: string) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: val } : row)))
  }

  async function handleSave() {
    const mapping: Record<string, string> = {}
    for (const row of rows) {
      if (row.key.trim() && row.value) {
        mapping[row.key.trim()] = row.value
      }
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/settings/tokens`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tokenId, field_mapping: mapping }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al guardar mapeo")
        return
      }
      toast.success("Mapeo de campos guardado")
      onSave?.(mapping)
    } catch {
      toast.error("Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Mapeo de campos
      </p>

      {rows.length === 0 && (
        <p className="text-sm text-slate-400">No hay mapeos configurados.</p>
      )}

      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={row.key}
            onChange={(e) => updateRow(idx, "key", e.target.value)}
            placeholder="Campo Make/webhook"
            className="flex-1"
          />
          <span className="text-slate-400 text-sm">→</span>
          <Select value={row.value} onValueChange={(v) => updateRow(idx, "value", v)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Campo CRM" />
            </SelectTrigger>
            <SelectContent>
              {CRM_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700"
            onClick={() => removeRow(idx)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="w-4 h-4 mr-1" /> Agregar campo
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={loading}>
          {loading ? "Guardando..." : "Guardar mapeo"}
        </Button>
      </div>
    </div>
  )
}
