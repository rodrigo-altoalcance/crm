import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { redirect } from "next/navigation"
import { StagesEditor } from "@/components/settings/StagesEditor"
import { SeedAgencyStagesButton } from "./SeedAgencyStagesButton"
import type { LeadStage } from "@/types/database"

export default async function AgencyStagesPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()
  const { data: stages } = await admin
    .from("agency_stages")
    .select("*")
    .order("position")

  const stagesMapped: LeadStage[] = (stages || []).map((s) => ({
    ...s,
    company_id: "agency",
  }))

  const hasStages = stagesMapped.length > 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Etapas del pipeline</h1>
        <p className="text-sm text-slate-500 mt-1">
          Etapas propias de la agencia, independientes de las de los clientes. Arrastra para reordenar.
        </p>
      </div>

      {!hasStages && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-800">No hay etapas configuradas</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Crea las etapas por defecto (Nuevo, Llamada agendada, Reunión, Negociación, Cerrado, No calificó) o agrégalas manualmente.
            </p>
          </div>
          <SeedAgencyStagesButton />
        </div>
      )}

      <StagesEditor initialStages={stagesMapped} apiPrefix="/api/admin/agency" />
    </div>
  )
}
