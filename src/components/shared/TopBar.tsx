"use client"

import { useRouter } from "next/navigation"
import { LogOut, UserCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { NotificationBell } from "./NotificationBell"

interface TopBarProps {
  userName: string
}

export function TopBar({ userName }: TopBarProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-end gap-4 flex-shrink-0">
      <NotificationBell />

      <div className="flex items-center gap-2 text-sm text-slate-700">
        <UserCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="font-medium truncate max-w-[180px]">{userName}</span>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        aria-label="Cerrar sesión"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </header>
  )
}
