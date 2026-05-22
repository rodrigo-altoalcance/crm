"use client"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"
import type { Lead } from "@/types/database"

interface CloseLeadConfirmDialogProps {
  open: boolean
  lead: Lead
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function CloseLeadConfirmDialog({ open, lead, onConfirm, onCancel, loading }: CloseLeadConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <DialogTitle>Cerrar lead como cliente</DialogTitle>
          </div>
          <DialogDescription>
            Esta acción moverá el lead al módulo de <strong>Clientes</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-slate-50 border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">
              {lead.first_name} {lead.last_name}
            </span>
            <Badge variant={lead.source === "meta" ? "info" : lead.source === "calendly" ? "warning" : "secondary"}>
              {lead.source}
            </Badge>
          </div>
          {lead.email && <p className="text-sm text-slate-500">{lead.email}</p>}
          {lead.phone && <p className="text-sm text-slate-500">{lead.phone}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
            {loading ? "Cerrando..." : "Confirmar cierre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
