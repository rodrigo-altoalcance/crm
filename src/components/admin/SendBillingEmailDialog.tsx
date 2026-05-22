"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Mail } from "lucide-react"
import type { EmailTemplate, Company } from "@/types/database"

interface SendBillingEmailDialogProps {
  company: Company
  templates: EmailTemplate[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendBillingEmailDialog({ company, templates, open, onOpenChange }: SendBillingEmailDialogProps) {
  const [templateId, setTemplateId] = useState(templates.find((t) => t.is_default)?.id || "")
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!templateId) return
    setLoading(true)
    const res = await fetch(`/api/admin/companies/${company.id}/send-billing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId }),
    })
    if (res.ok) {
      toast.success("Email enviado correctamente")
      onOpenChange(false)
    } else {
      const data = await res.json()
      toast.error(data.error || "Error al enviar email")
    }
    setLoading(false)
  }

  const selectedTemplate = templates.find((t) => t.id === templateId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" /> Enviar email de cobranza
          </DialogTitle>
          <DialogDescription>
            Se enviará un email a <strong>{company.email || company.org_email || "sin email"}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <div className="bg-slate-50 rounded-lg p-3 border">
              <p className="text-xs text-slate-500 mb-1">Asunto</p>
              <p className="text-sm text-slate-800">{selectedTemplate.subject}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={loading || !templateId}>
            {loading ? "Enviando..." : "Enviar email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
