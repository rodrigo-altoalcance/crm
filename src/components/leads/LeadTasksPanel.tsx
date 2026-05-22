"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { formatDate } from "@/lib/utils"
import { Plus, CheckSquare, Calendar } from "lucide-react"
import type { Task, Profile } from "@/types/database"

interface LeadTasksPanelProps {
  leadId: string
  tasks: Task[]
  teamMembers: Pick<Profile, "id" | "full_name">[]
  companyId: string
}

export function LeadTasksPanel({ leadId, tasks, teamMembers, companyId }: LeadTasksPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: "",
    priority: "medium" as const,
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    const res = await fetch(`/api/leads/${leadId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null }),
    })
    if (res.ok) {
      setForm({ title: "", description: "", assigned_to: "", due_date: "", priority: "medium" })
      setShowForm(false)
      router.refresh()
    } else {
      toast.error("Error al crear tarea")
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Tareas ({tasks.length})
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 bg-slate-50 rounded-lg p-3 border">
            <div className="space-y-1">
              <Label htmlFor="task-title">Título *</Label>
              <Input id="task-title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="due-date">Fecha límite</Label>
                <Input id="due-date" type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
              </div>
            </div>
            {teamMembers.length > 0 && (
              <div className="space-y-1">
                <Label>Asignar a</Label>
                <Select value={form.assigned_to} onValueChange={(v) => set("assigned_to", v)}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>{loading ? "..." : "Crear"}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        )}

        {tasks.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 text-center py-4">No hay tareas</p>
        )}

        <div className="space-y-2">
          {tasks.map((task: any) => (
            <div key={task.id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <PriorityBadge priority={task.priority} />
                  {task.due_date && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" /> {formatDate(task.due_date)}
                    </span>
                  )}
                  {task.assigned_profile && (
                    <span className="text-xs text-slate-500">{task.assigned_profile.full_name}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
