"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin/settings", label: "General", exact: true },
  { href: "/admin/settings/organization", label: "Organización" },
  { href: "/admin/settings/stages", label: "Etapas" },
  { href: "/admin/settings/integrations", label: "Integraciones" },
  { href: "/admin/settings/changes", label: "Cambios" },
  { href: "/admin/settings/emails", label: "Templates de Email" },
]

export function AdminSettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="w-52 flex-shrink-0 bg-white border-r border-slate-200 py-6 px-3 min-h-screen">
      <p className="px-3 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Configuración
      </p>
      <ul className="space-y-0.5">
        {navItems.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
