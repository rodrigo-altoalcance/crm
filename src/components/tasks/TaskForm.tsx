"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Profile } from "@/types/database"

interface TaskFormProps {
  teamMembers: Pick<Profile, "id" | "full_name">[]
  companyId: string
  onSuccess: () => void
  tasksApiPrefix?: string
}

export function TaskForm({ teamMembers, companyId, onSuccess, tasksApiPrefix = "/api" }: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: "",
    priority: "medium",
    status: "pending",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${tasksApiPrefix}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          assigned_to: form.assigned_to || null,
          due_date: form.due_date || null,
          description: form.description || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al crear tarea")
        return
      }
      toast.success("Tarea creada")
      onSuccess()
    } catch {
      toast.error("Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="task-title">Título *</Label>
        <Input
          id="task-title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Título de la tarea"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-desc">Descripción</Label>
        <Textarea
          id="task-desc"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Descripción opcional..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Prioridad</Label>
          <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baja</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="in_progress">En progreso</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-due">Fecha límite</Label>
        <Input
          id="task-due"
          type="date"
          value={form.due_date}
          onChange={(e) => set("due_date", e.target.value)}
        />
      </div>

      {teamMembers.length > 0 && (
        <div className="space-y-1.5">
          <Label>Asignar a</Label>
          <Select value={form.assigned_to} onValueChange={(v) => set("assigned_to", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear tarea"}
        </Button>
      </div>
    </form>
  )
}
