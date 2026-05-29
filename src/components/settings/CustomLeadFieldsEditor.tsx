"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Plus, Trash2, ChevronUp, ChevronDown, Copy, Code2 } from "lucide-react"
import { toSnakeCase } from "@/lib/utils"
import type { CustomLeadField } from "@/types/database"

const FIXED_FIELDS = [
  { key: "nombre", label: "Nombre" },
  { key: "email", label: "Email" },
  { key: "telefono", label: "Teléfono" },
  { key: "fecha_agenda", label: "Fecha de agenda" },
  { key: "origen", label: "Origen" },
]

const TIPO_LABELS: Record<string, string> = {
  texto: "Texto",
  numero: "Número",
  fecha: "Fecha",
}

interface CustomLeadFieldsEditorProps {
  initialFields: CustomLeadField[]
  apiPrefix: string
}

export function CustomLeadFieldsEditor({ initialFields, apiPrefix }: CustomLeadFieldsEditorProps) {
  const [fields, setFields] = useState<CustomLeadField[]>(initialFields)
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState("")
  const [tipo, setTipo] = useState<"texto" | "numero" | "fecha">("texto")
  const [obligatorio, setObligatorio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<CustomLeadField | null>(null)
  const [deleting, setDeleting] = useState(false)

  const customFieldsApiPrefix = `${apiPrefix}/custom-fields`

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    try {
      const res = await fetch(customFieldsApiPrefix, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), tipo, obligatorio }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al crear campo")
        return
      }
      const created = await res.json()
      setFields((prev) => [...prev, created])
      setNombre("")
      setTipo("texto")
      setObligatorio(false)
      setShowForm(false)
      toast.success("Campo agregado")
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
      const res = await fetch(`${customFieldsApiPrefix}/${confirmDelete.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al eliminar")
        return
      }
      setFields((prev) => prev.filter((f) => f.id !== confirmDelete.id))
      setConfirmDelete(null)
      toast.success("Campo eliminado")
    } catch {
      toast.error("Error de red")
    } finally {
      setDeleting(false)
    }
  }

  async function moveField(idx: number, direction: "up" | "down") {
    const newFields = [...fields]
    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= newFields.length) return

    ;[newFields[idx], newFields[targetIdx]] = [newFields[targetIdx], newFields[idx]]

    const updated = newFields.map((f, i) => ({ ...f, orden: i }))
    setFields(updated)

    try {
      await Promise.all([
        fetch(`${customFieldsApiPrefix}/${updated[idx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orden: updated[idx].orden }),
        }),
        fetch(`${customFieldsApiPrefix}/${updated[targetIdx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orden: updated[targetIdx].orden }),
        }),
      ])
    } catch {
      toast.error("Error al reordenar")
    }
  }

  function buildJson(): string {
    const obj: Record<string, string> = {}
    for (const f of FIXED_FIELDS) {
      obj[f.key] = `{{${f.key}}}`
    }
    for (const f of fields) {
      const key = toSnakeCase(f.nombre)
      if (key) obj[key] = `{{${key}}}`
    }
    return JSON.stringify(obj, null, 2)
  }

  async function copyJson() {
    await navigator.clipboard.writeText(buildJson())
    toast.success("¡Copiado!")
  }

  return (
    <div className="space-y-6">
      {/* Campos personalizados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campos personalizados del lead</CardTitle>
          <p className="text-sm text-slate-500">
            Define campos adicionales que llegarán en el payload del webhook.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campos fijos — solo referencia */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Campos fijos (no editables)
            </p>
            <div className="flex flex-wrap gap-2">
              {FIXED_FIELDS.map((f) => (
                <span
                  key={f.key}
                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-mono"
                >
                  {f.key}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          {/* Campos personalizados */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Campos personalizados
            </p>
            {fields.length === 0 && !showForm && (
              <p className="text-sm text-slate-400">No hay campos personalizados aún.</p>
            )}

            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <div className="flex flex-col gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => moveField(idx, "up")}
                      disabled={idx === 0}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => moveField(idx, "down")}
                      disabled={idx === fields.length - 1}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-slate-800">{field.nombre}</span>
                    <span className="ml-2 text-xs text-slate-400 font-mono">{toSnakeCase(field.nombre)}</span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{TIPO_LABELS[field.tipo]}</span>
                  {field.obligatorio && (
                    <span className="text-xs text-red-500 shrink-0">Obligatorio</span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 shrink-0"
                    onClick={() => setConfirmDelete(field)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {showForm ? (
              <form onSubmit={handleAdd} className="mt-3 p-3 border border-slate-200 rounded-lg space-y-3 bg-slate-50">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-nombre" className="text-xs">Nombre del campo</Label>
                    <Input
                      id="cf-nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Empresa del cliente"
                      autoFocus
                      required
                    />
                    {nombre.trim() && (
                      <p className="text-xs text-slate-400 font-mono">
                        clave: {toSnakeCase(nombre.trim()) || "—"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-tipo" className="text-xs">Tipo</Label>
                    <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                      <SelectTrigger id="cf-tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="texto">Texto</SelectItem>
                        <SelectItem value="numero">Número</SelectItem>
                        <SelectItem value="fecha">Fecha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cf-obligatorio"
                    checked={obligatorio}
                    onChange={(e) => setObligatorio(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="cf-obligatorio" className="text-xs cursor-pointer">Obligatorio</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Guardando..." : "Agregar"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Agregar campo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generador JSON para Make */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-500" />
                JSON para Make.com
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Copia este JSON en el módulo HTTP de Make para enviar todos los campos al webhook.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={copyJson}>
              <Copy className="w-4 h-4 mr-1.5" /> Copiar JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre">
            {buildJson()}
          </pre>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="Eliminar campo"
        description={`¿Eliminar el campo "${confirmDelete?.nombre}"? Los valores ya guardados en leads existentes no se verán afectados.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
