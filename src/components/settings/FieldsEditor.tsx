"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { LeadFieldDefinition } from "@/types/database"

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "select", label: "Selección" },
]

interface FieldsEditorProps {
  fields: LeadFieldDefinition[]
}

export function FieldsEditor({ fields: initialFields }: FieldsEditorProps) {
  const router = useRouter()
  const [fields, setFields] = useState<LeadFieldDefinition[]>(initialFields)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", label: "", type: "text", options: "", required: false })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<LeadFieldDefinition | null>(null)
  const [deleting, setDeleting] = useState(false)

  function slugify(text: string) {
    return text
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.label.trim()) return
    setSaving(true)
    try {
      const options =
        form.type === "select"
          ? form.options
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : null

      const res = await fetch("/api/settings/field-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: slugify(form.name),
          label: form.label.trim(),
          type: form.type,
          options,
          required: form.required,
          position: fields.length,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al crear campo")
        return
      }
      const created = await res.json()
      setFields((prev) => [...prev, created])
      setForm({ name: "", label: "", type: "text", options: "", required: false })
      setShowForm(false)
      toast.success("Campo creado")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/settings/field-definitions/${confirmDelete.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al eliminar campo")
        return
      }
      setFields((prev) => prev.filter((f) => f.id !== confirmDelete.id))
      setConfirmDelete(null)
      toast.success("Campo eliminado")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {fields.length === 0 && !showForm && (
        <p className="text-sm text-slate-400 py-2">
          No hay campos personalizados. Agrega uno para capturar información adicional en tus leads.
        </p>
      )}

      {fields.map((field) => (
        <div
          key={field.id}
          className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg"
        >
          <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">{field.label}</span>
              <Badge variant="secondary" className="text-xs">
                {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
              </Badge>
              {field.required && (
                <Badge variant="destructive" className="text-xs">
                  Requerido
                </Badge>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono">{field.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 flex-shrink-0"
            onClick={() => setConfirmDelete(field)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}

      {showForm ? (
        <form onSubmit={handleCreate} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="field-label">Etiqueta visible</Label>
              <Input
                id="field-label"
                value={form.label}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    label: e.target.value,
                    name: slugify(e.target.value),
                  }))
                }}
                placeholder="Ej: Ciudad de origen"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="field-name">Clave interna</Label>
              <Input
                id="field-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: slugify(e.target.value) }))}
                placeholder="ciudad_origen"
                required
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
                  className="mr-2"
                />
                Requerido
              </Label>
            </div>
          </div>

          {form.type === "select" && (
            <div className="space-y-1.5">
              <Label htmlFor="field-options">Opciones (separadas por coma)</Label>
              <Input
                id="field-options"
                value={form.options}
                onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                placeholder="Opción A, Opción B, Opción C"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar campo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false)
                setForm({ name: "", label: "", type: "text", options: "", required: false })
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Agregar campo
        </Button>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null)
        }}
        title="Eliminar campo"
        description={`¿Eliminar el campo "${confirmDelete?.label}"? Se perderán los datos existentes en este campo.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
