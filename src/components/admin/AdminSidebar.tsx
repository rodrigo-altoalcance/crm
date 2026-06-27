"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Building2, Users, CreditCard, Zap,
  Settings, Mail, LogOut, ChevronRight, UserCog, CheckSquare,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Role } from "@/types/database"

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, superAdminOnly: false },
  { href: "/admin/companies", label: "Usuario Empresa", icon: Building2, superAdminOnly: false },
  { href: "/admin/leads", label: "Leads", icon: Zap, superAdminOnly: false },
  { href: "/admin/tasks", label: "Tareas", icon: CheckSquare, superAdminOnly: false },
  { href: "/admin/clients", label: "Clientes", icon: Users, superAdminOnly: false },
  { href: "/admin/team", label: "Equipo", icon: UserCog, superAdminOnly: true },
  { href: "/admin/settings", label: "Configuración", icon: Settings, superAdminOnly: false },
]

interface AdminSidebarProps {
  role: Role
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">Alto Alcance</p>
            <p className="text-xs text-slate-400 mt-0.5">Panel Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.filter(({ superAdminOnly }) => !superAdminOnly || role === "super_admin").map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all duration-150 w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
