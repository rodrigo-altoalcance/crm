import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { redirect } from "next/navigation"
import { StagesEditor } from "@/components/settings/StagesEditor"
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

  // Map agency_stages to LeadStage shape (company_id not needed by StagesEditor)
  const stagesMapped: LeadStage[] = (stages || []).map((s) => ({
    ...s,
    company_id: "agency",
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Etapas del pipeline</h1>
        <p className="text-sm text-slate-500 mt-1">
          Etapas propias de la agencia, independientes de las de los clientes. Arrastra para reordenar.
        </p>
      </div>
      <StagesEditor initialStages={stagesMapped} apiPrefix="/api/admin/agency" />
    </div>
  )
}
