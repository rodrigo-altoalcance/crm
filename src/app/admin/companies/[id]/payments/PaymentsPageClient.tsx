"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RegisterPaymentForm } from "@/components/admin/RegisterPaymentForm"
import { Plus } from "lucide-react"

interface PaymentsPageClientProps {
  companyId: string
}

export function PaymentsPageClient({ companyId }: PaymentsPageClientProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleSuccess() {
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4" /> Registrar pago
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        <RegisterPaymentForm companyId={companyId} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
