"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"
import type { Lead, LeadStage, Profile } from "@/types/database"

interface LeadsTableProps {
  leads: Lead[]
  stages: LeadStage[]
  teamMembers: Pick<Profile, "id" | "full_name" | "avatar_url">[]
}

const sourceLabels: Record<string, string> = {
  meta: "Meta",
  calendly: "Calendly",
  manual: "Manual",
}

export function LeadsTable({ leads, stages, teamMembers }: LeadsTableProps) {
  const stageMap = Object.fromEntries(stages.map((s) => [s.id, s]))
  const memberMap = Object.fromEntries(teamMembers.map((m) => [m.id, m]))

  return (
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-slate-500 py-12">
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
                  <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
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
                    {sourceLabels[lead.source]}
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
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
