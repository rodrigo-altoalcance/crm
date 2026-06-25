"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Users, Send, Pencil, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Profile } from "@/types/database"

export interface UserWithAuth extends Profile {
  email: string
  email_confirmed_at: string | null
}

const ROLE_LABELS: Record<string, string> = {
  company_admin: "Administrador",
  seller: "Vendedor",
  super_admin: "Super Admin",
}

interface EditForm {
  full_name: string
  role: string
  phone: string
}

interface CompanyUsersClientProps {
  users: UserWithAuth[]
  companyId: string
}

export function CompanyUsersClient({ users: initialUsers, companyId }: CompanyUsersClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<UserWithAuth | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ full_name: "", role: "", phone: "" })
  const [savingEdit, setSavingEdit] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  function openEdit(user: UserWithAuth) {
    setEditingUser(user)
    setEditForm({
      full_name: user.full_name ?? "",
      role: user.role,
      phone: user.phone ?? "",
    })
    setNewPassword("")
  }

  function closeEdit() {
    setEditingUser(null)
    setNewPassword("")
  }

  async function handleResendInvite(user: UserWithAuth) {
    setResendingId(user.id)
    try {
      const res = await fetch(
        `/api/admin/companies/${companyId}/users/${user.id}/resend-invite`,
        { method: "POST" }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al reenviar invitación")
        return
      }
      toast.success(`Invitación reenviada a ${user.email}`)
    } catch {
      toast.error("Error de red al reenviar invitación")
    } finally {
      setResendingId(null)
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setSavingEdit(true)
    try {
      const res = await fetch(
        `/api/admin/companies/${companyId}/users/${editingUser.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: editForm.full_name,
            role: editForm.role,
            phone: editForm.phone || null,
          }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al guardar cambios")
        return
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, full_name: editForm.full_name, role: editForm.role as Profile["role"], phone: editForm.phone || null }
            : u
        )
      )
      toast.success("Usuario actualizado")
      closeEdit()
    } catch {
      toast.error("Error de red al guardar")
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleSavePassword() {
    if (!editingUser) return
    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres")
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch(
        `/api/admin/companies/${companyId}/users/${editingUser.id}/password`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al actualizar contraseña")
        return
      }
      toast.success("Contraseña actualizada")
      setNewPassword("")
    } catch {
      toast.error("Error de red al actualizar contraseña")
    } finally {
      setSavingPassword(false)
    }
  }

  if (users.length === 0) {
    return (
      <div className="py-16 text-center">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No hay usuarios en esta empresa.</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Miembro desde</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.full_name}</TableCell>
              <TableCell className="text-slate-600 text-sm select-text">
                {user.email}
                {!user.email_confirmed_at && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                    Pendiente
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </TableCell>
              <TableCell className="text-slate-500">{user.phone || "—"}</TableCell>
              <TableCell className="text-slate-500 text-sm">
                {new Intl.DateTimeFormat("es-CL", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }).format(new Date(user.created_at))}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {!user.email_confirmed_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvite(user)}
                      disabled={resendingId === user.id}
                      className="text-xs gap-1.5"
                    >
                      {resendingId === user.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      Reenviar invitación
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(user)}
                    className="text-xs gap-1.5"
                  >
                    <Pencil className="w-3 h-3" />
                    Editar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) closeEdit() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit_full_name">Nombre completo</Label>
              <Input
                id="edit_full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <div className="px-3 py-2 text-sm rounded-md border bg-slate-50 text-slate-500 select-text">
                {editingUser?.email}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_role">Rol</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger id="edit_role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_admin">Administrador</SelectItem>
                  <SelectItem value="seller">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_phone">Teléfono</Label>
              <Input
                id="edit_phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+56 9 1234 5678"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Cambiar contraseña</p>
              <p className="text-xs text-slate-400 mt-0.5">Opcional — dejar vacío para no modificar</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new_password">Nueva contraseña</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={savingPassword || !newPassword}
                onClick={handleSavePassword}
              >
                {savingPassword ? "Actualizando..." : "Actualizar contraseña"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
