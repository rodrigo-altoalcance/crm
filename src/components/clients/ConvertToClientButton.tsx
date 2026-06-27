"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NewClientModal } from "@/components/clients/NewClientModal"

interface ConvertToClientButtonProps {
  leadData: {
    companyName?: string | null
    email?: string | null
    phone?: string | null
    firstName?: string | null
    lastName?: string | null
  }
}

export function ConvertToClientButton({ leadData }: ConvertToClientButtonProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const adminName = [leadData.firstName, leadData.lastName].filter(Boolean).join(" ")

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <UserPlus className="w-4 h-4 mr-2" /> Convertir en cliente
      </Button>

      <NewClientModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => router.push("/admin/clients")}
        prefill={{
          companyName: leadData.companyName || "",
          email: leadData.email || "",
          phone: leadData.phone || "",
          adminName,
          adminEmail: leadData.email || "",
        }}
      />
    </>
  )
}
