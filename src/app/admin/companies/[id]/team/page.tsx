import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"
import { isAgencyStaff } from "@/lib/auth/roles"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TeamView } from "@/components/team/TeamView"
import type { Profile } from "@/types/database"

export default async function AdminCompanyTeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || !isAgencyStaff(profile)) redirect("/login")

  const admin = createAdminClient()

  const [{ data: company }, { data: members }] = await Promise.all([
    admin.from("companies").select("id, name, max_users").eq("id", id).single(),
    admin.from("profiles").select("*").eq("company_id", id).order("created_at"),
  ])

  if (!company) notFound()

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/admin/companies/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a {company.name}
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipo — {company.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {members?.length || 0} miembro{(members?.length || 0) !== 1 ? "s" : ""} · máximo{" "}
            {company.max_users}
          </p>
        </div>
      </div>

      <TeamView
        members={(members || []) as Profile[]}
        companyId={id}
        currentUserRole="super_admin"
        currentUserId={profile.id}
        maxUsers={company.max_users}
        apiPrefix={`/api/admin/companies/${id}`}
        permissionsBasePath={`/admin/companies/${id}/team`}
      />
    </div>
  )
}
