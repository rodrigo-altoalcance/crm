"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CloseLeadConfirmDialog } from "./CloseLeadConfirmDialog"
import { formatDate, formatDateTime, formatScheduledAt } from "@/lib/utils"
import { Mail, Phone, MessageSquare, Calendar, Pencil, X, Check } from "lucide-react"
import type { Lead, LeadStage, Profile, CustomLeadField } from "@/types/database"
import { canCloseLead } from "@/lib/auth/roles"

interface LeadDetailPanelProps {
  lead: Lead
  stages: LeadStage[]
  teamMembers: Pick<Profile, "id" | "full_name" | "avatar_url">[]
  profile: Profile
  apiPrefix?: string
  closedRedirectPath?: string
  customFields?: CustomLeadField[]
  initialFieldValues?: Record<string, string>
}

const sourceLabels: Record<string, string> = {
  meta: "Meta",
  calendly: "Calendly",
  manual: "Manual",
}

export function LeadDetailPanel({ lead, stages, teamMembers, profile, apiPrefix = "/api", closedRedirectPath = "/dashboard/clients", customFields = [], initialFieldValues = {} }: LeadDetailPanelProps) {
  const router = useRouter()
  const [closingLead, setClosingLead] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(initialFieldValues)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null)
  const [pendingStageId, setPendingStageId] = useState<string | null>(null)
  const [currentStageId, setCurrentStageId] = useState(lead.stage_id)
  const [selectedStageId, setSelectedStageId] = useState(lead.stage_id)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [editingScheduled, setEditingScheduled] = useState(false)
  const [displayScheduledAt, setDisplayScheduledAt] = useState(lead.scheduled_at)
  const [scheduledValue, setScheduledValue] = useState(() => {
    if (!lead.scheduled_at) return ""
    const d = new Date(lead.scheduled_at)
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
      timeZone: "America/Santiago", hour12: false,
    }).formatToParts(d)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
  })
  const [savingScheduled, setSavingScheduled] = useState(false)

  const closePerm = canCloseLead(profile)
  const currentStage = stages.find((s) => s.id === currentStageId)
  const selectedStage = stages.find((s) => s.id === selectedStageId)
  const hasChanges = selectedStageId !== currentStageId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return

    if (hasChanges) {
      const stage = stages.find((s) => s.id === selectedStageId)
      if (!stage) return
      if (stage.is_final && closePerm) {
        setPendingStageId(selectedStageId)
        setClosingLead(true)
        return
      }
      if (stage.is_final && !closePerm) {
        toast.error("No tienes permiso para cerrar leads")
        return
      }
      await submitStageChange(selectedStageId, comment)
    } else {
      // Solo comentario, sin cambio de etapa
      setLoading(true)
      const res = await fetch(`${apiPrefix}/leads/${lead.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "comment", description: comment.trim() }),
      })
      if (res.ok) {
        setComment("")
        toast.success("Comentario guardado")
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al guardar comentario")
      }
      setLoading(false)
    }
  }

  async function submitStageChange(stageId: string, commentText: string) {
    setLoading(true)
    const res = await fetch(`${apiPrefix}/leads/${lead.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId, comment: commentText }),
    })
    if (res.ok) {
      setCurrentStageId(stageId)
      setComment("")
      router.refresh()
      toast.success("Etapa actualizada")
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Error al actualizar etapa")
    }
    setLoading(false)
  }

  async function saveScheduledAt() {
    setSavingScheduled(true)
    const value = scheduledValue ? new Date(scheduledValue).toISOString() : null
    const res = await fetch(`${apiPrefix}/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_at: value }),
    })
    if (res.ok) {
      toast.success("Fecha de agenda actualizada")
      setDisplayScheduledAt(value)
      setEditingScheduled(false)
      router.refresh()
    } else {
      toast.error("Error al guardar la fecha")
    }
    setSavingScheduled(false)
  }

  function startEditField(field: CustomLeadField) {
    setEditingFieldId(field.id)
    setEditingValue(fieldValues[field.id] ?? "")
  }

  async function saveFieldValue(field: CustomLeadField) {
    setSavingFieldId(field.id)
    const res = await fetch(`${apiPrefix}/leads/${lead.id}/custom-field-values`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_id: field.id, valor: editingValue }),
    })
    if (res.ok) {
      setFieldValues((prev) => ({ ...prev, [field.id]: editingValue }))
      setEditingFieldId(null)
      toast.success("Campo guardado")
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Error al guardar")
    }
    setSavingFieldId(null)
  }

  async function handleConfirmClose() {
    if (!pendingStageId) return
    await submitStageChange(pendingStageId, comment)
    setClosingLead(false)
    setPendingStageId(null)
    toast.success("Lead cerrado y movido a Clientes")
    router.push(closedRedirectPath)
  }

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
                <Calendar className="w-4 h-4 text-slate-400" /> {formatDateTime(lead.created_at)}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha de agenda inicial</p>
                {editingScheduled ? (
                  <div className="space-y-2">
                    <Input
                      type="datetime-local"
                      value={scheduledValue}
                      onChange={(e) => setScheduledValue(e.target.value)}
                      className="h-8 text-sm w-full"
                      disabled={savingScheduled}
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-green-600 border-green-200 hover:bg-green-50" onClick={saveScheduledAt} disabled={savingScheduled}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Guardar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-slate-400" onClick={() => setEditingScheduled(false)} disabled={savingScheduled}>
                        <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">
                      {displayScheduledAt ? formatScheduledAt(displayScheduledAt) : <span className="text-slate-400">Sin fecha</span>}
                    </span>
                    <button onClick={() => setEditingScheduled(true)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Etapa actual</p>
              {currentStage && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: currentStage.color }} />
                  <span className="font-medium text-slate-700">{currentStage.name}</span>
                  {currentStage.is_final && <span className="text-xs text-green-600 font-medium">✓ Cerrado</span>}
                </div>
              )}
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

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cambiar etapa</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Select value={selectedStageId} onValueChange={setSelectedStageId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue>
                    {selectedStage && (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedStage.color }} />
                        {selectedStage.name}
                        {selectedStage.is_final && " ✓"}
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

              <Textarea
                placeholder="Agregar comentario..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                disabled={loading}
              />

              <Button
                type="submit"
                size="sm"
                disabled={loading || !comment.trim()}
              >
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {customFields.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customFields.map((field) => {
              const isEditing = editingFieldId === field.id
              const isSaving = savingFieldId === field.id
              const currentValue = fieldValues[field.id]
              return (
                <div key={field.id} className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {field.nombre}
                    {field.obligatorio && <span className="text-red-400 ml-1">*</span>}
                  </p>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        type={field.tipo === "numero" ? "number" : field.tipo === "fecha" ? "date" : "text"}
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="h-8 text-sm w-full"
                        autoFocus
                        disabled={isSaving}
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-8 text-green-600 border-green-200 hover:bg-green-50" onClick={() => saveFieldValue(field)} disabled={isSaving}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Guardar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-slate-400" onClick={() => setEditingFieldId(null)} disabled={isSaving}>
                          <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">
                        {currentValue || <span className="text-slate-400">—</span>}
                      </span>
                      <button onClick={() => startEditField(field)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

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
