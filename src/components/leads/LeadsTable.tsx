"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { formatDate } from "@/lib/utils"
import type { Lead, LeadStage, Profile } from "@/types/database"

interface LeadsTableProps {
  leads: Lead[]
  stages: LeadStage[]
  teamMembers: Pick<Profile, "id" | "full_name" | "avatar_url">[]
  basePath?: string
  apiPrefix?: string
}

const sourceLabels: Record<string, string> = {
  meta: "Meta",
  calendly: "Calendly",
  manual: "Manual",
}

export function LeadsTable({
  leads,
  stages,
  teamMembers,
  basePath = "/dashboard/leads",
  apiPrefix = "/api",
}: LeadsTableProps) {
  const router = useRouter()
  const stageMap = Object.fromEntries(stages.map((s) => [s.id, s]))
  const memberMap = Object.fromEntries(teamMembers.map((m) => [m.id, m]))
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingDelete, setLoadingDelete] = useState(false)

  async function handleDelete() {
    if (!deletingId) return
    setLoadingDelete(true)
    try {
      const res = await fetch(`${apiPrefix}/leads/${deletingId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Lead eliminado")
        router.refresh()
      } else {
        toast.error("Error al eliminar el lead")
      }
    } catch {
      toast.error("Error de red")
    } finally {
      setLoadingDelete(false)
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Asignado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-12">
                  No hay leads para mostrar
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead) => {
              const stage = stageMap[lead.stage_id]
              const assigned = lead.assigned_to ? memberMap[lead.assigned_to] : null
              return (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`${basePath}/${lead.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {lead.first_name} {lead.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-600">{lead.email}</p>
                      {lead.phone && <p className="text-xs text-slate-400">{lead.phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={lead.source === "meta" ? "info" : lead.source === "calendly" ? "warning" : "secondary"}>
                      {sourceLabels[lead.source] || lead.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {stage && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-sm">{stage.name}</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {assigned ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">{assigned.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-slate-700">{assigned.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-500">{formatDate(lead.created_at)}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-slate-400 hover:text-red-600"
                      onClick={() => setDeletingId(lead.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null) }}
        title="Eliminar lead"
        description="¿Estás seguro de que quieres eliminar este lead? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={loadingDelete}
        variant="destructive"
      />
    </>
  )
}
