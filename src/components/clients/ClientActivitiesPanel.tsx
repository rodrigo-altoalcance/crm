"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Separator } from "@/components/ui/separator"
import { Trash2, Activity } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface ClientActivity {
  id: string
  type: string
  title: string
  description: string | null
  activity_date: string
  created_at: string
  profile: { full_name: string } | null
}

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  reunion:  { label: "Reunión",  className: "border-transparent bg-blue-100 text-blue-700" },
  llamada:  { label: "Llamada",  className: "border-transparent bg-green-100 text-green-700" },
  nota:     { label: "Nota",     className: "border-transparent bg-slate-100 text-slate-600" },
  acuerdo:  { label: "Acuerdo",  className: "border-transparent bg-purple-100 text-purple-700" },
  reporte:  { label: "Reporte",  className: "border-transparent bg-orange-100 text-orange-700" },
  otro:     { label: "Otro",     className: "border-transparent bg-slate-100 text-slate-500" },
}

interface Props {
  companyId: string
  initialActivities: ClientActivity[]
}

export function ClientActivitiesPanel({ companyId, initialActivities }: Props) {
  const [activities, setActivities] = useState<ClientActivity[]>(initialActivities)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ type: "nota", title: "", description: "", activity_date: "" })

  useEffect(() => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    setForm((f) => ({
      ...f,
      activity_date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
    }))
  }, [])

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error("El título es requerido"); return }

    setLoading(true)
    const res = await fetch(`/api/admin/clients/${companyId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        activity_date: form.activity_date,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Error al registrar la actividad")
      setLoading(false)
      return
    }

    const newActivity: ClientActivity = await res.json()
    setActivities((prev) => [newActivity, ...prev])
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    setForm({ type: "nota", title: "", description: "", activity_date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}` })
    toast.success("Actividad registrada")
    setLoading(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const res = await fetch(`/api/admin/clients/${companyId}/activities/${deleteId}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Error al eliminar la actividad")
    } else {
      setActivities((prev) => prev.filter((a) => a.id !== deleteId))
      toast.success("Actividad eliminada")
    }
    setDeleteId(null)
    setDeleting(false)
  }

  return (
    <div className="space-y-6">
      {/* Historial */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Historial de actividades
          </h2>
        </div>

        {activities.length === 0 ? (
          <EmptyState
            icon={<Activity className="w-6 h-6" />}
            title="Sin actividad registrada aún"
            description="Usa el formulario de abajo para registrar la primera actividad."
          />
        ) : (
          <ul className="divide-y">
            {activities.map((act) => {
              const cfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.otro
              return (
                <li key={act.id} className="px-6 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                      <span className="font-semibold text-slate-800 text-sm">{act.title}</span>
                    </div>
                    {act.description && (
                      <p className="text-sm text-slate-600 mt-0.5">{act.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1.5">
                      {formatDate(act.activity_date)}
                      {act.profile?.full_name && (
                        <> &mdash; <span className="text-slate-500">{act.profile.full_name}</span></>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteId(act.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Formulario inline */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
          Registrar actividad
        </h2>
        <Separator className="mb-4" />
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="act-type">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger id="act-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reunion">Reunión</SelectItem>
                  <SelectItem value="llamada">Llamada</SelectItem>
                  <SelectItem value="nota">Nota</SelectItem>
                  <SelectItem value="acuerdo">Acuerdo</SelectItem>
                  <SelectItem value="reporte">Reporte</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="act-date">Fecha</Label>
              <Input
                id="act-date"
                type="date"
                value={form.activity_date}
                onChange={(e) => setField("activity_date", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="act-title">Título *</Label>
              <Input
                id="act-title"
                placeholder="Descripción breve de la actividad"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="act-desc">Descripción (opcional)</Label>
              <Textarea
                id="act-desc"
                placeholder="Detalles adicionales..."
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Registrando..." : "Registrar actividad"}
          </Button>
        </form>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Eliminar actividad"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
