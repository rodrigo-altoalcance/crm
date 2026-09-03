"use client"

import { useRouter } from "next/navigation"
import { Ban, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/EmptyState"
import { SUSPENDED_COMPANY_MESSAGE } from "@/lib/auth/companyStatus"

export function SuspendedAccountView() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <EmptyState
        icon={<Ban className="w-6 h-6" />}
        title="Cuenta suspendida"
        description={SUSPENDED_COMPANY_MESSAGE}
      />
      <Button onClick={handleLogout} variant="outline" className="w-full">
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </Button>
    </div>
  )
}
