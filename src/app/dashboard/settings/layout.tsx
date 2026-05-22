import Link from "next/link"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { redirect } from "next/navigation"

const settingsLinks = [
  { href: "/dashboard/settings/stages", label: "Etapas" },
  { href: "/dashboard/settings/organization", label: "Organización" },
  { href: "/dashboard/settings/integrations", label: "Integraciones" },
  { href: "/dashboard/settings/fields", label: "Campos" },
]

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
      </div>

      <div className="flex gap-8">
        <nav className="w-44 flex-shrink-0">
          <ul className="space-y-1">
            {settingsLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
