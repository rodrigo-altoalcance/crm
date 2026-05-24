"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export function SeedStagesButton({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSeed() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/stages/seed`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Error al crear etapas")
        return
      }
      toast.success("Etapas por defecto creadas")
      router.refresh()
    } catch {
      toast.error("Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleSeed} disabled={loading} size="sm" className="shrink-0">
      <Sparkles className="w-4 h-4 mr-1" />
      {loading ? "Creando..." : "Crear por defecto"}
    </Button>
  )
}
