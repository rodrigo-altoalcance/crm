import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { InviteUserForm } from "@/components/admin/InviteUserForm"
import { CompanyUsersClient, type UserWithAuth } from "@/components/admin/CompanyUsersClient"
import type { Profile } from "@/types/database"

export default async function CompanyUsersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, max_users")
    .eq("id", id)
    .single()

  if (!company) notFound()

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", id)
    .order("created_at", { ascending: true })

  const profileList = (profiles || []) as Profile[]

  // Fetch auth user data (email + confirmation status) for each profile
  const admin = createAdminClient()
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authMap = new Map(
    (authList?.users ?? []).map((u) => [u.id, { email: u.email ?? "", email_confirmed_at: u.email_confirmed_at ?? null }])
  )

  const users: UserWithAuth[] = profileList.map((p) => ({
    ...p,
    email: authMap.get(p.id)?.email ?? "",
    email_confirmed_at: authMap.get(p.id)?.email_confirmed_at ?? null,
  }))

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/admin/companies/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a {company.name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
            <p className="text-sm text-slate-500 mt-1">
              {company.name} &mdash; {users.length} / {company.max_users} usuarios
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
          <CompanyUsersClient users={users} companyId={id} />
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
            Crear usuario empresa
          </h2>
          {users.length >= company.max_users ? (
            <p className="text-sm text-amber-600">
              Se alcanzó el límite de {company.max_users} usuarios. Aumenta el límite en la configuración de la empresa para poder invitar más.
            </p>
          ) : (
            <InviteUserForm companyId={id} />
          )}
        </div>
      </div>
    </div>
  )
}
