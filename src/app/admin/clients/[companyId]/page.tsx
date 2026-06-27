import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, GitBranch, Settings, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ClientActivitiesPanel } from "@/components/clients/ClientActivitiesPanel"
import { formatCLP } from "@/lib/utils"

export default async function AdminClientFichaPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()

  const [{ data: company }, { data: activities }] = await Promise.all([
    admin.from("companies").select("*").eq("id", companyId).single(),
    admin
      .from("agency_client_activities")
      .select("*, profile:profiles(full_name)")
      .eq("company_id", companyId)
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ])

  if (!company) notFound()

  return (
    <div className="p-8">
      <Link
        href="/admin/clients"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a Clientes
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StatusBadge status={company.status} />
            {company.monthly_fee != null && (
              <span className="text-sm text-slate-500">
                {company.currency === "CLP"
                  ? formatCLP(company.monthly_fee)
                  : `USD ${company.monthly_fee.toLocaleString("es-CL")}`}{" "}
                / mes
              </span>
            )}
            {company.email && (
              <span className="text-sm text-slate-400">{company.email}</span>
            )}
          </div>
        </div>

        {/* Botones de acceso rápido */}
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/companies/${companyId}/leads`}>
            <Button size="sm" variant="outline">
              <GitBranch className="w-3.5 h-3.5 mr-1.5" /> Pipeline
            </Button>
          </Link>
          <Link href={`/admin/companies/${companyId}/team`}>
            <Button size="sm" variant="outline">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Equipo
            </Button>
          </Link>
          <Link href={`/admin/companies/${companyId}/users`}>
            <Button size="sm" variant="outline">
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Usuarios
            </Button>
          </Link>
          <Link href={`/admin/companies/${companyId}/edit`}>
            <Button size="sm" variant="outline">
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar empresa
            </Button>
          </Link>
        </div>
      </div>

      <ClientActivitiesPanel
        companyId={companyId}
        initialActivities={(activities || []) as any}
      />
    </div>
  )
}
