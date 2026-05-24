import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { StagesEditor } from "@/components/settings/StagesEditor"

export default async function AdminCompanyStagesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()
  const [{ data: company }, { data: stages }] = await Promise.all([
    admin.from("companies").select("id, name").eq("id", id).single(),
    admin.from("lead_stages").select("*").eq("company_id", id).order("position"),
  ])

  if (!company) notFound()

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

      <StagesEditor
        initialStages={stages || []}
        apiPrefix={`/api/admin/companies/${id}`}
      />
    </div>
  )
}
