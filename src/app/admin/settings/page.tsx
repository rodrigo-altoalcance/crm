import { createClient } from "@/lib/supabase/server"
import { AdminSettingsForm } from "./AdminSettingsForm"

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from("crm_settings").select("*")

  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">Configuración general de la agencia</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminSettingsForm settings={settingsMap} />
      </div>
    </div>
  )
}
