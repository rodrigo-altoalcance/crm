"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FieldMappingEditor } from "./FieldMappingEditor"
import { Copy, RefreshCw, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { WebhookToken } from "@/types/database"

interface WebhookConfigProps {
  tokens: WebhookToken[]
  webhookBaseUrl: string
  apiPrefix?: string
}

export function WebhookConfig({ tokens: initialTokens, webhookBaseUrl, apiPrefix = "/api/settings" }: WebhookConfigProps) {
  const router = useRouter()
  const [tokens, setTokens] = useState<WebhookToken[]>(initialTokens)
  const [newTokenName, setNewTokenName] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<WebhookToken | null>(null)
  const [deleting, setDeleting] = useState(false)

  function webhookUrl(token: string) {
    return `${webhookBaseUrl}/api/webhook/leads/${token}`
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    toast.success("URL copiada al portapapeles")
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTokenName.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`${apiPrefix}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al crear token")
        return
      }
      const created = await res.json()
      setTokens((prev) => [...prev, created])
      setNewTokenName("")
      setShowCreateForm(false)
      toast.success("Token creado")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setCreating(false)
    }
  }

  async function handleRegenerate(token: WebhookToken) {
    setRegenerating(token.id)
    try {
      const res = await fetch(`${apiPrefix}/tokens/${token.id}`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al regenerar")
        return
      }
      const newToken = await res.json()
      setTokens((prev) => prev.map((t) => (t.id === token.id ? newToken : t)))
      toast.success("Token regenerado")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setRegenerating(null)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`${apiPrefix}/tokens/${confirmDelete.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al eliminar")
        return
      }
      setTokens((prev) => prev.filter((t) => t.id !== confirmDelete.id))
      setConfirmDelete(null)
      toast.success("Token eliminado")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {tokens.map((token) => (
        <Card key={token.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{token.name}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerate(token)}
                  disabled={regenerating === token.id}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${regenerating === token.id ? "animate-spin" : ""}`} />
                  Regenerar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => setConfirmDelete(token)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">URL del webhook</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl(token.token)}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(webhookUrl(token.token))}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <FieldMappingEditor
              tokenId={token.id}
              initialMapping={token.field_mapping || {}}
              apiPrefix={apiPrefix}
            />
          </CardContent>
        </Card>
      ))}

      {showCreateForm ? (
        <form onSubmit={handleCreate} className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="token-name">Nombre del token</Label>
            <Input
              id="token-name"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="Ej: Meta Ads, Calendly"
              autoFocus
              required
            />
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? "Creando..." : "Crear"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
            Cancelar
          </Button>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo token
        </Button>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="Eliminar token"
        description={`¿Eliminar el token "${confirmDelete?.name}"? Los webhooks que lo usen dejarán de funcionar.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
