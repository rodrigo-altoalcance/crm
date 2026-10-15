import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { isUserActive } from "@/lib/auth/teamGuards"
import { redirect } from "next/navigation"
import { AdminTeamView } from "./AdminTeamView"

export default async function AdminTeamPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/admin")

  const admin = createAdminClient()
  const { data: members } = await admin
    .from("profiles")
    .select("*")
    .in("role", ["super_admin", "agency_member"])
    .order("created_at")

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authById = new Map((authList?.users || []).map((u) => [u.id, u]))

  const membersWithAuth = (members || []).map((member) => ({
    ...member,
    active: isUserActive(authById.get(member.id)),
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Equipo de la agencia</h1>
        <p className="text-sm text-slate-500 mt-1">
          {members?.length || 0} miembro{(members?.length || 0) !== 1 ? "s" : ""} con acceso al panel
        </p>
      </div>

      <AdminTeamView members={membersWithAuth} currentUserId={profile.id} />
    </div>
  )
}
