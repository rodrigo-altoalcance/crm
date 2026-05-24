"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { Mail, Trash2, Edit } from "lucide-react"
import Link from "next/link"
import type { EmailTemplate } from "@/types/database"

export function EmailTemplateList({ templates }: { templates: EmailTemplate[] }) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const res = await fetch(`/api/admin/email-templates/${deleteId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Template eliminado")
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error || "Error al eliminar")
    }
    setDeleting(false)
    setDeleteId(null)
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<Mail className="w-6 h-6" />}
        title="No hay templates"
        description="Crea tu primer template de email de cobranza."
      />
    )
  }

  return (
    <>
      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border p-5 shadow-sm flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                {t.type === "welcome" && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Bienvenida</Badge>}
                {t.type === "invitation" && <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">Invitación</Badge>}
                {t.type === "billing" && <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">Cobranza</Badge>}
                {t.is_default && <Badge variant="info">Por defecto</Badge>}
              </div>
              <p className="text-sm text-slate-500 truncate">{t.subject}</p>
            </div>
            <div className="flex gap-2 ml-4">
              <Button asChild variant="ghost" size="icon">
                <Link href={`/admin/settings/emails/${t.id}/edit`}>
                  <Edit className="w-4 h-4" />
                </Link>
              </Button>
              {!t.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => setDeleteId(t.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="¿Eliminar template?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
