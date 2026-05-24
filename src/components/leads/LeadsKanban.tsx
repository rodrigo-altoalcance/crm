"use client"

import { useState, useCallback } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { LeadCard } from "./LeadCard"
import { CloseLeadConfirmDialog } from "./CloseLeadConfirmDialog"
import type { Lead, LeadStage, Profile } from "@/types/database"

interface LeadsKanbanProps {
  leads: Lead[]
  stages: LeadStage[]
  profile: Profile
  companyId: string
  basePath?: string
  apiPrefix?: string
}

export function LeadsKanban({ leads: initialLeads, stages, profile, companyId, basePath = "/dashboard/leads", apiPrefix = "/api" }: LeadsKanbanProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [closingLead, setClosingLead] = useState<Lead | null>(null)
  const [pendingStageId, setPendingStageId] = useState<string | null>(null)
  const router = useRouter()

  const canClose = profile.role === "super_admin" || profile.role === "company_admin" || profile.permissions?.can_close_leads

  const onDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStageId = destination.droppableId
    const lead = leads.find((l) => l.id === draggableId)
    if (!lead || lead.stage_id === newStageId) return

    const targetStage = stages.find((s) => s.id === newStageId)

    if (targetStage?.is_final && canClose) {
      setPendingStageId(newStageId)
      setClosingLead(lead)
      return
    }

    await moveLeadToStage(lead.id, newStageId)
  }, [leads, stages, canClose])

  async function moveLeadToStage(leadId: string, stageId: string) {
    setLeads((prev) =>
      prev.map((l) => l.id === leadId ? { ...l, stage_id: stageId } : l)
    )

    const res = await fetch(`${apiPrefix}/leads/${leadId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId }),
    })

    if (!res.ok) {
      toast.error("Error al mover lead")
      router.refresh()
    } else {
      router.refresh()
    }
  }

  async function handleConfirmClose() {
    if (!closingLead || !pendingStageId) return
    await moveLeadToStage(closingLead.id, pendingStageId)
    setClosingLead(null)
    setPendingStageId(null)
    toast.success("Lead cerrado y movido a Clientes")
  }

  const leadsByStage = stages.reduce<Record<string, Lead[]>>((acc, stage) => {
    acc[stage.id] = leads.filter((l) => l.stage_id === stage.id)
    return acc
  }, {})

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageLeads = leadsByStage[stage.id] || []
            return (
              <div key={stage.id} className="flex-shrink-0 w-72">
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

      {closingLead && (
        <CloseLeadConfirmDialog
          open={!!closingLead}
          lead={closingLead}
          onConfirm={handleConfirmClose}
          onCancel={() => {
            setClosingLead(null)
            setPendingStageId(null)
          }}
        />
      )}
    </>
  )
}
