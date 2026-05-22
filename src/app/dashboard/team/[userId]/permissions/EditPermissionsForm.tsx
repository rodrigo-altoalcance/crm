"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PermissionsEditor } from "@/components/team/PermissionsEditor"
import { getDefaultPermissions } from "@/lib/auth/roles"
import type { UserPermissions } from "@/types/database"

interface EditPermissionsFormProps {
  userId: string
  initialPermissions: UserPermissions | null
}

export function EditPermissionsForm({ userId, initialPermissions }: EditPermissionsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [permissions, setPermissions] = useState<UserPermissions>(
    initialPermissions ?? getDefaultPermissions()
  )

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al guardar permisos")
        return
      }
      toast.success("Permisos actualizados")
      router.push("/dashboard/team")
    } catch {
      toast.error("Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PermissionsEditor value={permissions} onChange={setPermissions} />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Guardando..." : "Guardar permisos"}
        </Button>
      </div>
    </div>
  )
}
