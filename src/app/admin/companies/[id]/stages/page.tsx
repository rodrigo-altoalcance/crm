import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { isAgencyStaff } from "@/lib/auth/roles"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { StagesEditor } from "@/components/settings/StagesEditor"
import { SeedStagesButton } from "./SeedStagesButton"

export default async function AdminCompanyStagesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || !isAgencyStaff(profile)) redirect("/login")

  const admin = createAdminClient()
  const [{ data: company }, { data: stages }] = await Promise.all([
    admin.from("companies").select("id, name").eq("id", id).single(),
    admin.from("lead_stages").select("*").eq("company_id", id).order("position"),
  ])

  if (!company) notFound()

  const hasStages = (stages?.length ?? 0) > 0

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/admin/companies/${id}`}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a {company.name}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Etapas del pipeline</h1>
        <p className="text-sm text-slate-500 mt-1">
          {company.name} · Arrastra para reordenar. Las etapas finales marcan leads como clientes ganados.
        </p>
      </div>

      {!hasStages && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-800">Esta empresa no tiene etapas</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Crea las etapas por defecto (Nuevo, Llamada agendada, Reunión, Negociación, Cerrado, No calificó) o agrégalas manualmente.
            </p>
          </div>
          <SeedStagesButton companyId={id} />
        </div>
      )}

      <StagesEditor
        initialStages={stages || []}
        apiPrefix={`/api/admin/companies/${id}`}
      />
    </div>
  )
}
