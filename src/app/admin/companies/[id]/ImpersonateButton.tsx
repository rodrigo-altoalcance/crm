"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

export default function ImpersonateButton({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    setLoading(true)
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId }),
    })
    if (res.ok) {
      router.push("/dashboard")
    } else {
      toast.error("Error al entrar como empresa")
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading}>
      <LogIn className="w-4 h-4" />
      {loading ? "Entrando..." : "Entrar como empresa"}
    </Button>
  )
}
