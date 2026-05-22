"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CloseLeadConfirmDialog } from "./CloseLeadConfirmDialog"
import { formatDate } from "@/lib/utils"
import { Mail, Phone, MessageSquare, Calendar } from "lucide-react"
import type { Lead, LeadStage, Profile } from "@/types/database"
import { canCloseLead } from "@/lib/auth/roles"

interface LeadDetailPanelProps {
  lead: Lead
  stages: LeadStage[]
  teamMembers: Pick<Profile, "id" | "full_name" | "avatar_url">[]
  profile: Profile
}

const sourceLabels: Record<string, string> = {
  meta: "Meta",
  calendly: "Calendly",
  manual: "Manual",
}

export function LeadDetailPanel({ lead, stages, teamMembers, profile }: LeadDetailPanelProps) {
  const router = useRouter()
  const [closingLead, setClosingLead] = useState(false)
  const [pendingStageId, setPendingStageId] = useState<string | null>(null)
  const [currentStageId, setCurrentStageId] = useState(lead.stage_id)
  const [loading, setLoading] = useState(false)

  const closePerm = canCloseLead(profile)

  async function handleStageChange(stageId: string) {
    const stage = stages.find((s) => s.id === stageId)
    if (!stage) return
    if (stage.is_final && closePerm) {
      setPendingStageId(stageId)
      setClosingLead(true)
      return
    }
    await updateStage(stageId)
  }

  async function updateStage(stageId: string) {
    setLoading(true)
    const res = await fetch(`/api/leads/${lead.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId }),
    })
    if (res.ok) {
      setCurrentStageId(stageId)
      router.refresh()
    } else {
      toast.error("Error al actualizar etapa")
    }
    setLoading(false)
  }

  async function handleConfirmClose() {
    if (!pendingStageId) return
    await updateStage(pendingStageId)
    setClosingLead(false)
    setPendingStageId(null)
    toast.success("Lead cerrado y movido a Clientes")
    router.push("/dashboard/clients")
  }

  const currentStage = stages.find((s) => s.id === currentStageId)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl">
              {lead.first_name} {lead.last_name}
            </CardTitle>
            <Badge variant={lead.source === "meta" ? "info" : lead.source === "calendly" ? "warning" : "secondary"}>
              {sourceLabels[lead.source]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" /> {lead.email}
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" /> {lead.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" /> {formatDate(lead.created_at)}
              </div>
            </div>
            {lead.message && (
              <div className="flex gap-2 text-sm text-slate-600">
                <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>{lead.message}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Etapa</p>
              <Select value={currentStageId} onValueChange={handleStageChange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue>
                    {currentStage && (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStage.color }} />
                        {currentStage.name}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.name}
                        {stage.is_final && " ✓"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Asignado a</p>
              {(lead as any).assigned_profile ? (
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs">{(lead as any).assigned_profile.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{(lead as any).assigned_profile.full_name}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">Sin asignar</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <CloseLeadConfirmDialog
        open={closingLead}
        lead={lead}
        onConfirm={handleConfirmClose}
        onCancel={() => { setClosingLead(false); setPendingStageId(null) }}
        loading={loading}
      />
    </>
  )
}
