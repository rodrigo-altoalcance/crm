"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { UserPlus, Settings, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { InviteTeamMemberForm } from "./InviteTeamMemberForm"
import { toast } from "sonner"
import type { Profile, Role } from "@/types/database"

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  company_admin: "Administrador",
  seller: "Vendedor",
}

const roleVariants: Record<Role, "default" | "secondary" | "info"> = {
  super_admin: "default",
  company_admin: "info",
  seller: "secondary",
}

function permissionsSummary(profile: Profile): string {
  const p = profile.permissions
  if (!p) return "Sin permisos"
  const items: string[] = []
  if (p.can_view_all_leads) items.push("Ver todos")
  if (p.can_create_leads) items.push("Crear")
  if (p.can_edit_leads) items.push("Editar")
  if (p.can_delete_leads) items.push("Eliminar")
  if (p.can_close_leads) items.push("Cerrar")
  if (p.can_view_reports) items.push("Reportes")
  if (p.can_manage_stages) items.push("Etapas")
  return items.length > 0 ? items.join(", ") : "Sin permisos especiales"
}

interface TeamViewProps {
  members: Profile[]
  companyId: string
  currentUserRole: Role
  currentUserId?: string
  maxUsers: number
  apiPrefix?: string
  permissionsBasePath?: string
}

export function TeamView({ members, companyId, currentUserRole, currentUserId, maxUsers, apiPrefix = "/api", permissionsBasePath = "/dashboard/team" }: TeamViewProps) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const canInvite = currentUserRole === "company_admin" || currentUserRole === "super_admin"
  const atLimit = members.length >= maxUsers

  function handleInviteSuccess() {
    setInviteOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!deletingId) return
    setLoadingDelete(true)
    try {
      const res = await fetch(`${apiPrefix}/team/${deletingId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al eliminar el miembro")
        return
      }
      toast.success("Miembro eliminado del equipo")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setLoadingDelete(false)
      setDeletingId(null)
    }
  }

  const deletingMember = members.find((m) => m.id === deletingId)

  return (
    <>
      <div className="flex justify-end mb-4">
        {canInvite && (
          <Button onClick={() => setInviteOpen(true)} disabled={atLimit}>
            <UserPlus className="w-4 h-4 mr-1" /> Invitar miembro
          </Button>
        )}
      </div>

      {atLimit && canInvite && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4">
          Has alcanzado el límite de {maxUsers} usuarios. Contacta a soporte para ampliar tu plan.
        </p>
      )}

      {/* Mobile: lista de miembros */}
      <div className="md:hidden bg-white rounded-xl border shadow-sm overflow-hidden divide-y divide-slate-100">
        {members.length === 0 && (
          <div className="text-center text-slate-500 py-12">No hay miembros en el equipo</div>
        )}
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarFallback className="bg-indigo-100 text-indigo-600 text-sm">
                {member.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-900 truncate">{member.full_name}</span>
                <Badge variant={roleVariants[member.role]} className="text-xs flex-shrink-0">
                  {roleLabels[member.role]}
                </Badge>
              </div>
              {member.role === "seller" && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{permissionsSummary(member)}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {canInvite && member.role === "seller" && (
                <Link href={`${permissionsBasePath}/${member.id}/permissions`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              {canInvite && member.id !== currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                  onClick={() => setDeletingId(member.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Miembro</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Permisos</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 py-12">
                  No hay miembros en el equipo
                </TableCell>
              </TableRow>
            )}
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-indigo-100 text-indigo-600 text-sm">
                        {member.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-slate-900">{member.full_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleVariants[member.role]}>{roleLabels[member.role]}</Badge>
                </TableCell>
                <TableCell>
                  {member.role === "seller" ? (
                    <span className="text-xs text-slate-500 truncate max-w-xs block">
                      {permissionsSummary(member)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Acceso completo</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {canInvite && member.role === "seller" && (
                      <Link href={`${permissionsBasePath}/${member.id}/permissions`}>
                        <Button variant="ghost" size="icon">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    {canInvite && member.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => setDeletingId(member.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar miembro al equipo</DialogTitle>
          </DialogHeader>
          <InviteTeamMemberForm companyId={companyId} onSuccess={handleInviteSuccess} apiPrefix={apiPrefix} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null) }}
        title="Eliminar miembro"
        description={`¿Eliminar a ${deletingMember?.full_name} del equipo? Perderá acceso inmediatamente.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={loadingDelete}
        variant="destructive"
      />
    </>
  )
}
