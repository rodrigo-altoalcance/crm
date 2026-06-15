"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal"
import { formatScheduledAt } from "@/lib/utils"
import { Plus, CheckSquare, Calendar, AlertTriangle } from "lucide-react"
import type { Task, Profile } from "@/types/database"

const statusConfig = {
  pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  in_progress: { label: "En Progreso", className: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Completada", className: "bg-green-100 text-green-700 border-green-200" },
}

interface LeadTasksPanelProps {
  leadId: string
  tasks: Task[]
  teamMembers: Pick<Profile, "id" | "full_name">[]
  apiPrefix?: string
  taskApiPrefix?: string
  canEdit?: boolean
}

export function LeadTasksPanel({
  leadId,
  tasks,
  teamMembers,
  apiPrefix = "/api",
  taskApiPrefix = "/api",
  canEdit = false,
}: LeadTasksPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [creatorCalendarConnected, setCreatorCalendarConnected] = useState(false)
  const [syncToCalendar, setSyncToCalendar] = useState(false)
  const [assigneeCalendarWarning, setAssigneeCalendarWarning] = useState<string | null>(null)
  const router = useRouter()
  const [form, setForm] = useState({
    title: "",
    assigned_to: "",
    due_date: "",
    priority: "medium" as const,
  })

  const activeTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress")

  // Check if current user has Google Calendar connected
  useEffect(() => {
    fetch("/api/auth/google-calendar/status")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.connected) setCreatorCalendarConnected(true)
      })
      .catch(() => undefined)
  }, [])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleAssigneeChange(userId: string) {
    set("assigned_to", userId)
    setAssigneeCalendarWarning(null)

    if (!syncToCalendar || !userId) return

    // Check if assignee has Google Calendar
    try {
      const res = await fetch(`/api/auth/google-calendar/status?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        if (!data.connected) {
          const member = teamMembers.find((m) => m.id === userId)
          setAssigneeCalendarWarning(
            `${member?.full_name ?? "El asignado"} no tiene Google Calendar vinculado. El evento no se creará en su calendario.`
          )
        }
      }
    } catch {
      // ignore
    }
  }

  async function handleSyncChange(checked: boolean) {
    setSyncToCalendar(checked)
    setAssigneeCalendarWarning(null)

    if (!checked || !form.assigned_to) return

    // Re-check assignee calendar when enabling sync
    try {
      const res = await fetch(`/api/auth/google-calendar/status?userId=${form.assigned_to}`)
      if (res.ok) {
        const data = await res.json()
        if (!data.connected) {
          const member = teamMembers.find((m) => m.id === form.assigned_to)
          setAssigneeCalendarWarning(
            `${member?.full_name ?? "El asignado"} no tiene Google Calendar vinculado. El evento no se creará en su calendario.`
          )
        }
      }
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    const res = await fetch(`${apiPrefix}/leads/${leadId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        priority: form.priority,
        sync_to_calendar: syncToCalendar,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setForm({ title: "", assigned_to: "", due_date: "", priority: "medium" })
      setSyncToCalendar(false)
      setAssigneeCalendarWarning(null)
      setShowForm(false)
      if (data._calendarSyncFailed) {
        toast.warning("Tarea creada. No se pudo sincronizar con Google Calendar.")
      }
      router.refresh()
    } else {
      toast.error("Error al crear tarea")
    }
    setLoading(false)
  }

  function handleOpenForm() {
    setShowForm(true)
    setSyncToCalendar(false)
    setAssigneeCalendarWarning(null)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> Tareas activas ({activeTasks.length})
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={handleOpenForm}>
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
                  <Label htmlFor="due-date">Fecha y hora límite</Label>
                  <Input
                    id="due-date"
                    type="datetime-local"
                    value={form.due_date}
                    onChange={(e) => set("due_date", e.target.value)}
                  />
                </div>
              </div>
              {teamMembers.length > 0 && (
                <div className="space-y-1">
                  <Label>Asignar a</Label>
                  <Select value={form.assigned_to} onValueChange={handleAssigneeChange}>
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {creatorCalendarConnected && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sync-calendar"
                      checked={syncToCalendar}
                      onCheckedChange={(v) => handleSyncChange(!!v)}
                    />
                    <Label htmlFor="sync-calendar" className="text-sm cursor-pointer">
                      Sincronizar con Google Calendar
                    </Label>
                  </div>
                  {assigneeCalendarWarning && (
                    <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {assigneeCalendarWarning}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>{loading ? "..." : "Crear"}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          )}

          {activeTasks.length === 0 && !showForm && (
            <p className="text-sm text-slate-400 text-center py-4">Sin tareas activas</p>
          )}

          <div className="space-y-1">
            {activeTasks.map((task: any) => {
              const sc = statusConfig[task.status as keyof typeof statusConfig]
              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="w-full text-left flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={`text-xs ${sc?.className}`}>{sc?.label}</Badge>
                      <PriorityBadge priority={task.priority} />
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" /> {formatScheduledAt(task.due_date)}
                        </span>
                      )}
                      {task.assigned_profile && (
                        <span className="text-xs text-slate-500">{task.assigned_profile.full_name}</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskApiPrefix={taskApiPrefix}
          onUpdated={() => { setSelectedTask(null); router.refresh() }}
          canEdit={canEdit}
          teamMembers={teamMembers}
        />
      )}
    </>
  )
}
