"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

export function LeadNoteForm({ leadId, apiPrefix = "/api" }: { leadId: string; apiPrefix?: string }) {
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    setLoading(true)
    const res = await fetch(`${apiPrefix}/leads/${leadId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: note, type: "note_added" }),
    })
    if (res.ok) {
      setNote("")
      router.refresh()
    } else {
      toast.error("Error al agregar nota")
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Agregar nota
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="Escribe una nota sobre este lead..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <Button type="submit" size="sm" disabled={loading || !note.trim()}>
            {loading ? "Guardando..." : "Agregar nota"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
