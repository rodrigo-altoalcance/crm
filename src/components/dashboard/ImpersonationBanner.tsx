"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImpersonationBannerProps {
  companyName: string
}

export function ImpersonationBanner({ companyName }: ImpersonationBannerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleExit() {
    setLoading(true)
    await fetch("/api/admin/impersonate/exit", { method: "POST" })
    router.push("/admin/companies")
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium">
          Estás viendo el portal como{" "}
          <strong>{companyName}</strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-300 text-amber-800 hover:bg-amber-100 h-7 text-xs"
        onClick={handleExit}
        disabled={loading}
      >
        <X className="w-3.5 h-3.5" />
        {loading ? "Saliendo..." : "Salir"}
      </Button>
    </div>
  )
}
