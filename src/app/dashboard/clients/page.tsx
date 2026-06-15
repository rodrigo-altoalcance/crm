import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ClientsTable } from "@/components/clients/ClientsTable"
import { EmptyState } from "@/components/shared/EmptyState"
import { Users } from "lucide-react"

export default async function ClientsPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) redirect("/login")

  // Fetch final stages for the company
  const { data: finalStages } = await supabase
    .from("lead_stages")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_final", true)

  const finalStageIds = (finalStages || []).map((s) => s.id)

  let clients: any[] = []
  if (finalStageIds.length > 0) {
    const { data } = await supabase
      .from("leads")
      .select("*, stage:lead_stages(*), client_records(count)")
      .eq("company_id", companyId)
      .in("stage_id", finalStageIds)
      .order("updated_at", { ascending: false })
    clients = (data || []).map((lead) => ({
      ...lead,
      client_records_count: (lead.client_records as any)?.[0]?.count ?? 0,
    }))
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="text-sm text-slate-500 mt-1">{clients.length} cliente{clients.length !== 1 ? "s" : ""} en total</p>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No hay clientes aún"
          description="Los leads que se cierren como ganados aparecerán aquí."
        />
      ) : (
        <ClientsTable clients={clients} companyId={companyId} />
      )}
    </div>
  )
}
