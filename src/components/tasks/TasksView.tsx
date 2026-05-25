"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Calendar, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskForm } from "./TaskForm"
import { TaskDetailModal } from "./TaskDetailModal"
import { EmptyState } from "@/components/shared/EmptyState"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckSquare } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { Task, Profile } from "@/types/database"

const statusConfig = {
  pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  in_progress: { label: "En Progreso", className: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Completada", className: "bg-green-100 text-green-700 border-green-200" },
}

type StatusFilter = "pending" | "in_progress" | "completed"

interface TasksViewProps {
  tasks: Task[]
  teamMembers: Profile[]
  companyId: string
  profile?: Profile
  tasksApiPrefix?: string
}

export function TasksView({ tasks, teamMembers, companyId, tasksApiPrefix = "/api" }: TasksViewProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeStatuses, setActiveStatuses] = useState<StatusFilter[]>(["pending", "in_progress"])
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")

  function toggleStatus(s: StatusFilter) {
    setActiveStatuses((prev) =>
      prev.includes(s)
        ? prev.length === 1 ? prev // keep at least one active
          : prev.filter((x) => x !== s)
        : [...prev, s]
    )
  }

  const filtered = tasks.filter((t) => {
    if (!activeStatuses.includes(t.status as StatusFilter)) return false
    if (assigneeFilter !== "all" && (t as any).assigned_profile?.id !== assigneeFilter && t.assigned_to !== assigneeFilter) return false
    return true
  })

  function handleSuccess() {
    setDialogOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        {/* Status filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["pending", "in_progress", "completed"] as StatusFilter[]).map((s) => {
            const sc = statusConfig[s]
            const active = activeStatuses.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  active ? sc.className : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                }`}
              >
                {sc.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          {teamMembers.length > 0 && (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="Responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nueva tarea
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CheckSquare className="w-6 h-6" />} title="No hay tareas" />
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_200px_160px_120px_110px] gap-4 px-4 py-2.5 border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Tarea</span>
            <span>Lead</span>
            <span>Responsable</span>
            <span>Fecha límite</span>
            <span>Estado</span>
          </div>

          {filtered.map((task: any) => {
            const sc = statusConfig[task.status as StatusFilter] ?? statusConfig.pending
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="w-full grid grid-cols-[1fr_200px_160px_120px_110px] gap-4 px-4 py-3 border-b last:border-0 hover:bg-slate-50 transition-colors text-left items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                  <PriorityBadge priority={task.priority} />
                </div>

                <div className="min-w-0">
                  {task.lead ? (
                    <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
                      <LinkIcon className="w-3 h-3 flex-shrink-0" />
                      {task.lead.first_name} {task.lead.last_name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>

                <div>
                  {task.assigned_profile ? (
                    <span className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-600">
                          {task.assigned_profile.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{task.assigned_profile.full_name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>

                <div>
                  {task.due_date ? (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(task.due_date)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>

                <div>
                  <Badge variant="outline" className={`text-xs ${sc.className}`}>{sc.label}</Badge>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Create task dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <TaskForm
            teamMembers={teamMembers}
            companyId={companyId}
            onSuccess={handleSuccess}
            tasksApiPrefix={tasksApiPrefix}
          />
        </DialogContent>
      </Dialog>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskApiPrefix={tasksApiPrefix}
          onUpdated={() => { setSelectedTask(null); router.refresh() }}
        />
      )}
    </>
  )
}
