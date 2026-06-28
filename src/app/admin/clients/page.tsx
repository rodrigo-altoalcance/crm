import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { isAgencyStaff, canViewFinancials } from "@/lib/auth/roles"
import { redirect } from "next/navigation"
import { ClientsListClient } from "@/components/clients/ClientsListClient"

export default async function AdminClientsPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || !isAgencyStaff(profile)) redirect("/login")
  const showFinancials = canViewFinancials(profile)

  const admin = createAdminClient()
  const { data: companies } = await admin
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false })

  const companyIds = (companies || []).map((c) => c.id)

  const [{ data: profileRows }, { data: activityRows }] = await Promise.all([
    companyIds.length > 0
      ? admin.from("profiles").select("company_id").in("company_id", companyIds)
      : Promise.resolve({ data: [] as { company_id: string | null }[] }),
    companyIds.length > 0
      ? admin
          .from("agency_client_activities")
          .select("company_id, activity_date")
          .in("company_id", companyIds)
          .order("activity_date", { ascending: false })
      : Promise.resolve({ data: [] as { company_id: string; activity_date: string }[] }),
  ])

  const userCountMap: Record<string, number> = {}
  for (const p of profileRows || []) {
    if (p.company_id) userCountMap[p.company_id] = (userCountMap[p.company_id] || 0) + 1
  }

  const lastActivityMap: Record<string, string> = {}
  for (const act of activityRows || []) {
    if (!lastActivityMap[act.company_id]) lastActivityMap[act.company_id] = act.activity_date
  }

  const clients = (companies || []).map((c) => ({
    ...c,
    userCount: userCountMap[c.id] || 0,
    lastActivity: lastActivityMap[c.id] || null,
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="text-sm text-slate-500 mt-1">Empresas clientes de la agencia</p>
      </div>
      <ClientsListClient clients={clients} canViewFinancials={showFinancials} />
    </div>
  )
}
