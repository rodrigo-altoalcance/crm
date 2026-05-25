"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Link as LinkIcon, MessageSquare } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { Task, TaskComment } from "@/types/database"

const statusConfig = {
  pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  in_progress: { label: "En Progreso", className: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Completada", className: "bg-green-100 text-green-700 border-green-200" },
}

interface TaskDetailModalProps {
  task: Task & { lead?: { id: string; first_name: string; last_name: string } | null }
  open: boolean
  onClose: () => void
  taskApiPrefix?: string
  onUpdated: () => void
}

export function TaskDetailModal({
  task,
  open,
  onClose,
  taskApiPrefix = "/api",
  onUpdated,
}: TaskDetailModalProps) {
  const [status, setStatus] = useState(task.status)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingComment, setSavingComment] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  const taskUrl = `${taskApiPrefix}/tasks/${task.id}`
  const commentsUrl = `${taskApiPrefix}/tasks/${task.id}/comments`

  useEffect(() => {
    if (!open) return
    setStatus(task.status)
    loadComments()
  }, [open, task.id])

  async function loadComments() {
    setLoadingComments(true)
    try {
      const res = await fetch(commentsUrl)
      if (res.ok) setComments(await res.json())
    } catch {
      // ignore
    } finally {
      setLoadingComments(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (newStatus === status) return
    setSavingStatus(true)
    const res = await fetch(taskUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setStatus(newStatus as Task["status"])
      toast.success("Estado actualizado")
      if (newStatus === "completed") {
        onUpdated()
        return
      }
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Error al actualizar estado")
    }
    setSavingStatus(false)
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return
    setSavingComment(true)
    const res = await fetch(commentsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newComment.trim() }),
    })
    if (res.ok) {
      const created = await res.json()
      setComments((prev) => [...prev, created])
      setNewComment("")
      toast.success("Comentario guardado")
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Error al guardar comentario")
    }
    setSavingComment(false)
  }

  const sc = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.pending

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg leading-snug pr-6">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Task meta */}
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            {task.due_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                {formatDate(task.due_date)}
              </span>
            )}
            {(task as any).assigned_profile && (
              <span className="flex items-center gap-1.5">
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-[10px]">
                    {(task as any).assigned_profile.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {(task as any).assigned_profile.full_name}
              </span>
            )}
            {task.lead && (
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-slate-400" />
                {task.lead.first_name} {task.lead.last_name}
              </span>
            )}
            <PriorityBadge priority={task.priority} />
          </div>

          {/* Status selector */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</p>
            <div className="flex items-center gap-3">
              <Select value={status} onValueChange={handleStatusChange} disabled={savingStatus}>
                <SelectTrigger className="w-44">
                  <SelectValue>
                    <Badge variant="outline" className={`text-xs ${sc.className}`}>{sc.label}</Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">Pendiente</Badge>
                  </SelectItem>
                  <SelectItem value="in_progress">
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">En Progreso</Badge>
                  </SelectItem>
                  <SelectItem value="completed">
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">Completada</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
              {savingStatus && <span className="text-xs text-slate-400">Guardando...</span>}
            </div>
          </div>

          {/* Task description */}
          {task.description && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</p>
              <p className="text-sm text-slate-700">{task.description}</p>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Comentarios {comments.length > 0 && `(${comments.length})`}
            </p>

            {loadingComments ? (
              <p className="text-xs text-slate-400">Cargando...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-400">Sin comentarios aún</p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar className="w-6 h-6 flex-shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-600">
                        {(c as any).profile?.full_name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-700">
                          {(c as any).profile?.full_name ?? "Usuario"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(c.created_at).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddComment} className="space-y-2">
              <Textarea
                placeholder="Agregar un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                disabled={savingComment}
              />
              <Button type="submit" size="sm" disabled={savingComment || !newComment.trim()}>
                {savingComment ? "Guardando..." : "Guardar comentario"}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
