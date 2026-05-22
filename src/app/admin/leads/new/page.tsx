import { createClient } from "@/lib/supabase/server"
import { AdminLeadForm } from "@/components/admin/AdminLeadForm"

export default async function NewAdminLeadPage() {
  const supabase = await createClient()
  const { data: companies } = await supabase.from("companies").select("id, name").eq("status", "active").order("name")

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo lead</h1>
        <p className="text-sm text-slate-500 mt-1">Crear un lead manualmente para una empresa</p>
      </div>
      <AdminLeadForm companies={companies || []} />
    </div>
  )
}
