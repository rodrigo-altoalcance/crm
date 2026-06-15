"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { GripVertical, Plus, Trash2, Check } from "lucide-react"
import type { LeadStage } from "@/types/database"

interface StagesEditorProps {
  initialStages: LeadStage[]
  apiPrefix?: string
}

const COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#3B82F6", "#EF4444", "#14B8A6", "#F97316", "#64748B",
]

export function StagesEditor({ initialStages, apiPrefix = "/api" }: StagesEditorProps) {
  const router = useRouter()
  const [stages, setStages] = useState<LeadStage[]>(initialStages)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<LeadStage | null>(null)
  const [addingName, setAddingName] = useState("")
  const [addingColor, setAddingColor] = useState(COLORS[0])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  function startEdit(stage: LeadStage) {
    setEditingId(stage.id)
    setEditName(stage.name)
    setEditColor(stage.color)
  }

  async function saveEdit(stage: LeadStage) {
    if (!editName.trim()) return
    try {
      const res = await fetch(`${apiPrefix}/stages/${stage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al guardar")
        return
      }
      const updated = await res.json()
      setStages((prev) => prev.map((s) => (s.id === stage.id ? updated : s)))
      setEditingId(null)
      toast.success("Etapa actualizada")
      router.refresh()
    } catch {
      toast.error("Error de red")
    }
  }

  async function toggleFlag(stage: LeadStage, flag: "is_final" | "is_lost") {
    try {
      const res = await fetch(`${apiPrefix}/stages/${stage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [flag]: !stage[flag] }),
      })
      if (!res.ok) {
        toast.error("Error al actualizar")
        return
      }
      const updated = await res.json()
      setStages((prev) => prev.map((s) => (s.id === stage.id ? updated : s)))
      router.refresh()
    } catch {
      toast.error("Error de red")
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setLoading(true)
    try {
      const res = await fetch(`${apiPrefix}/stages/${deleting.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "No se puede eliminar")
        return
      }
      setStages((prev) => prev.filter((s) => s.id !== deleting.id))
      setDeleting(null)
      toast.success("Etapa eliminada")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addingName.trim()) return
    setLoading(true)
    try {
      const maxPos = stages.reduce((max, s) => Math.max(max, s.position), -1)
      const res = await fetch(`${apiPrefix}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addingName.trim(), color: addingColor, position: maxPos + 1 }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al crear etapa")
        return
      }
      const created = await res.json()
      setStages((prev) => [...prev, created])
      setAddingName("")
      setAddingColor(COLORS[0])
      setShowAddForm(false)
      toast.success("Etapa creada")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setLoading(false)
    }
  }

  // Drag-and-drop reorder
  function handleDragStart(id: string) {
    setDragging(id)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    setDragOver(id)
  }

  async function handleDrop(targetId: string) {
    if (!dragging || dragging === targetId) {
      setDragging(null)
      setDragOver(null)
      return
    }

    const fromIdx = stages.findIndex((s) => s.id === dragging)
    const toIdx = stages.findIndex((s) => s.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return

    const reordered = [...stages]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const updated = reordered.map((s, i) => ({ ...s, position: i }))
    setStages(updated)
    setDragging(null)
    setDragOver(null)

    try {
      await fetch(`${apiPrefix}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated.map((s) => ({ id: s.id, position: s.position }))),
      })
      router.refresh()
    } catch {
      toast.error("Error al reordenar")
    }
  }

  return (
    <div className="space-y-3">
      {stages.map((stage) => (
        <div
          key={stage.id}
          draggable
          onDragStart={() => handleDragStart(stage.id)}
          onDragOver={(e) => handleDragOver(e, stage.id)}
          onDrop={() => handleDrop(stage.id)}
          onDragEnd={() => { setDragging(null); setDragOver(null) }}
          className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${
            dragOver === stage.id ? "border-indigo-400 bg-indigo-50" : ""
          } ${dragging === stage.id ? "opacity-50" : ""}`}
        >
          {editingId === stage.id ? (
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-48"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 transition-all ${editColor === c ? "border-slate-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setEditColor(c)}
                  />
                ))}
              </div>
              <Button size="sm" onClick={() => saveEdit(stage)}>
                <Check className="w-3 h-3 mr-1" /> Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab flex-shrink-0" />
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span
                  className="flex-1 min-w-0 font-medium text-slate-800 cursor-pointer hover:text-indigo-600 truncate"
                  onClick={() => startEdit(stage)}
                >
                  {stage.name}
                </span>
              </div>

              <div className="flex items-center gap-3 sm:ml-auto pl-7 sm:pl-0">
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id={`final-${stage.id}`}
                    checked={stage.is_final}
                    onCheckedChange={() => toggleFlag(stage, "is_final")}
                  />
                  <Label htmlFor={`final-${stage.id}`} className="text-xs text-slate-500 cursor-pointer">
                    Final
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id={`lost-${stage.id}`}
                    checked={stage.is_lost}
                    onCheckedChange={() => toggleFlag(stage, "is_lost")}
                  />
                  <Label htmlFor={`lost-${stage.id}`} className="text-xs text-slate-500 cursor-pointer">
                    Perdido
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => setDeleting(stage)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showAddForm ? (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-dashed border-indigo-300 p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              value={addingName}
              onChange={(e) => setAddingName(e.target.value)}
              placeholder="Nombre de la etapa"
              className="w-48"
              autoFocus
              required
            />
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-6 h-6 rounded-full border-2 transition-all ${addingColor === c ? "border-slate-800 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setAddingColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Creando..." : "Crear etapa"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Agregar etapa
        </Button>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="Eliminar etapa"
        description={`¿Eliminar "${deleting?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  )
}
