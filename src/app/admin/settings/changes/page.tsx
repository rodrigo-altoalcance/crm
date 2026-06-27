import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { isAgencyStaff } from "@/lib/auth/roles"
import { redirect } from "next/navigation"
import type { AdminAuditLog } from "@/types/database"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

const sectionLabels: Record<string, string> = {
  organization: "Organización",
  stages: "Etapas",
  integrations: "Integraciones",
  general: "General",
}

export default async function ChangesPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || !isAgencyStaff(profile)) redirect("/login")

  const admin = createAdminClient()
  const { data: logs } = await admin
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  const entries = (logs || []) as AdminAuditLog[]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Historial de cambios</h1>
        <p className="text-sm text-slate-500 mt-1">
          Registro de modificaciones en la configuración de la agencia
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No hay cambios registrados todavía.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Fecha</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Sección</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Acción</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((log, i) => (
                <tr
                  key={log.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                >
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                      {sectionLabels[log.section] || log.section}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{log.action}</td>
                  <td className="px-5 py-3 text-slate-500">{log.user_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
