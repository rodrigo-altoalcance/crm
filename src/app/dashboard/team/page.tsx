import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TeamView } from "@/components/team/TeamView"

export default async function TeamPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) redirect("/login")

  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at")

  const { data: company } = await supabase
    .from("companies")
    .select("max_users")
    .eq("id", companyId)
    .single()

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Equipo</h1>
        <p className="text-sm text-slate-500 mt-1">
          {members?.length || 0} miembro{(members?.length || 0) !== 1 ? "s" : ""} ·{" "}
          máximo {company?.max_users || 0}
        </p>
      </div>

      <TeamView
        members={members || []}
        companyId={companyId}
        currentUserRole={profile.role}
        currentUserId={profile.id}
        maxUsers={company?.max_users || 10}
      />
    </div>
  )
}
