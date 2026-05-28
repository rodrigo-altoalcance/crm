"use client"

import { useState, useCallback, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { LeadCard } from "./LeadCard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Lead, LeadStage, Profile } from "@/types/database"

interface LeadsKanbanProps {
  leads: Lead[]
  stages: LeadStage[]
  profile: Profile
  companyId?: string
  basePath?: string
  apiPrefix?: string
}

interface PendingMove {
  lead: Lead
  fromStage: LeadStage
  toStage: LeadStage
}

export function LeadsKanban({ leads: initialLeads, stages, profile, basePath = "/dashboard/leads", apiPrefix = "/api" }: LeadsKanbanProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)

  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])
  const [moveComment, setMoveComment] = useState("")
  const [moving, setMoving] = useState(false)
  const router = useRouter()

  const canClose = profile.role === "super_admin" || profile.role === "company_admin" || profile.permissions?.can_close_leads

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStageId = destination.droppableId
    const lead = leads.find((l) => l.id === draggableId)
    if (!lead || lead.stage_id === newStageId) return

    const toStage = stages.find((s) => s.id === newStageId)
    const fromStage = stages.find((s) => s.id === lead.stage_id)
    if (!toStage || !fromStage) return

    if (toStage.is_final && !canClose) {
      toast.error("No tienes permiso para cerrar leads")
      return
    }

    setPendingMove({ lead, fromStage, toStage })
    setMoveComment("")
  }, [leads, stages, canClose])

  async function confirmMove() {
    if (!pendingMove || !moveComment.trim()) return
    setMoving(true)

    setLeads((prev) =>
      prev.map((l) => l.id === pendingMove.lead.id ? { ...l, stage_id: pendingMove.toStage.id } : l)
    )

    const res = await fetch(`${apiPrefix}/leads/${pendingMove.lead.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: pendingMove.toStage.id, comment: moveComment.trim() }),
    })

    if (!res.ok) {
      toast.error("Error al mover lead")
      router.refresh()
    } else {
      if (pendingMove.toStage.is_final) {
        toast.success("Lead cerrado y movido a Clientes")
      }
      router.refresh()
    }

    setPendingMove(null)
    setMoveComment("")
    setMoving(false)
  }

  function cancelMove() {
    setPendingMove(null)
    setMoveComment("")
  }

  const leadsByStage = stages.reduce<Record<string, Lead[]>>((acc, stage) => {
    acc[stage.id] = leads.filter((l) => l.stage_id === stage.id)
    return acc
  }, {})

  return (
    <>
      <div className="overflow-x-auto w-full pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => {
            const stageLeads = leadsByStage[stage.id] || []
            return (
              <div key={stage.id} className="flex-shrink-0 min-w-[280px] w-72">
                <div
                  className="flex items-center justify-between px-3 py-2.5 rounded-t-xl"
                  style={{ backgroundColor: stage.color + "20" }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm font-semibold text-slate-800">{stage.name}</span>
                  </div>
                  <span className="text-xs font-medium bg-white/80 text-slate-600 px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[120px] rounded-b-xl p-2 space-y-2 transition-colors ${
                        snapshot.isDraggingOver ? "bg-slate-100" : "bg-slate-50"
                      }`}
                    >
                      {stageLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? "rotate-1 shadow-lg" : ""}
                            >
                              <LeadCard lead={lead} basePath={basePath} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
      </div>

      <Dialog open={!!pendingMove} onOpenChange={(v) => { if (!v) cancelMove() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingMove ? `Mover lead: ${pendingMove.lead.first_name} ${pendingMove.lead.last_name}` : "Mover lead"}
            </DialogTitle>
          </DialogHeader>

          {pendingMove && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-slate-100 text-slate-700 rounded px-2 py-1">{pendingMove.fromStage.name}</span>
                <span className="text-slate-400">→</span>
                <span className="bg-indigo-100 text-indigo-700 font-medium rounded px-2 py-1">{pendingMove.toStage.name}</span>
              </div>

              {pendingMove.toStage.is_final && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Este lead será cerrado y movido al módulo de Clientes.
                </p>
              )}

              <Textarea
                placeholder="Escribe un comentario (requerido)..."
                value={moveComment}
                onChange={(e) => setMoveComment(e.target.value)}
                rows={3}
                autoFocus
                disabled={moving}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelMove} disabled={moving}>
              Cancelar
            </Button>
            <Button onClick={confirmMove} disabled={!moveComment.trim() || moving}>
              {moving ? "Guardando..." : "Aceptar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
