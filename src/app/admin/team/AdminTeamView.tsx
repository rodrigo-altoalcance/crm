"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UserPlus, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Profile } from "@/types/database"

type AgencyRole = "super_admin" | "agency_member"

interface AdminTeamViewProps {
  members: Profile[]
  currentUserId: string
}

export function AdminTeamView({ members: initialMembers, currentUserId }: AdminTeamViewProps) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)

  // Invite state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState({ full_name: "", email: "", role: "agency_member" as AgencyRole })
  const [loadingInvite, setLoadingInvite] = useState(false)

  // Edit role state
  const [editingMember, setEditingMember] = useState<Profile | null>(null)
  const [editRole, setEditRole] = useState<AgencyRole>("agency_member")
  const [loadingEdit, setLoadingEdit] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingDelete, setLoadingDelete] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim()) return
    setLoadingInvite(true)
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: form.full_name, email: form.email, role: form.role }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al enviar invitación")
        return
      }
      toast.success(`Invitación enviada a ${form.email}`)
      setForm({ full_name: "", email: "", role: "agency_member" })
      setInviteOpen(false)
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setLoadingInvite(false)
    }
  }

  function openEdit(member: Profile) {
    setEditingMember(member)
    setEditRole(member.role as AgencyRole)
  }

  async function handleEditRole(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMember) return
    setLoadingEdit(true)
    try {
      const res = await fetch(`/api/admin/team/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al cambiar rol")
        return
      }
      setMembers((prev) => prev.map((m) => m.id === editingMember.id ? { ...m, role: editRole } : m))
      toast.success("Rol actualizado")
      setEditingMember(null)
    } catch {
      toast.error("Error de red")
    } finally {
      setLoadingEdit(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    setLoadingDelete(true)
    try {
      const res = await fetch(`/api/admin/team/${deletingId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al eliminar")
        return
      }
      setMembers((prev) => prev.filter((m) => m.id !== deletingId))
      toast.success("Administrador eliminado")
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
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1" /> Invitar miembro
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Miembro</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 py-12">
                  No hay administradores
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
                    <div>
                      <p className="font-medium text-slate-900">{member.full_name}</p>
                      {member.id === currentUserId && (
                        <p className="text-xs text-indigo-600">Tú</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    member.role === "super_admin"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {member.role === "super_admin" ? "Administrador" : "Colaborador"}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {new Intl.DateTimeFormat("es-CL", { year: "numeric", month: "short", day: "numeric" }).format(new Date(member.created_at))}
                </TableCell>
                <TableCell>
                  {member.id !== currentUserId && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-indigo-600"
                        onClick={() => openEdit(member)}
                        title="Cambiar rol"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => setDeletingId(member.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar miembro al equipo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Nombre completo *</Label>
              <Input
                id="inv-name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Ana García"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email *</Label>
              <Input
                id="inv-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="ana@agencia.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-role">Rol</Label>
              <select
                id="inv-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AgencyRole }))}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="agency_member">Colaborador (sin acceso financiero)</option>
                <option value="super_admin">Administrador (acceso completo)</option>
              </select>
            </div>
            <p className="text-xs text-slate-500">
              Se enviará un correo de invitación para que el nuevo miembro cree su contraseña.
            </p>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loadingInvite}>
                {loadingInvite ? "Enviando..." : "Enviar invitación"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => { if (!open) setEditingMember(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar rol — {editingMember?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditRole} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Rol</Label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as AgencyRole)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="agency_member">Colaborador (sin acceso financiero)</option>
                <option value="super_admin">Administrador (acceso completo)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loadingEdit || editRole === (editingMember?.role as AgencyRole)}>
                {loadingEdit ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null) }}
        title="Eliminar miembro"
        description={`¿Eliminar a ${deletingMember?.full_name}? Perderá acceso al panel inmediatamente.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={loadingDelete}
        variant="destructive"
      />
    </>
  )
}
