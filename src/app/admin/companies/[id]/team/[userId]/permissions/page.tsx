import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EditAdminPermissionsForm } from "./EditAdminPermissionsForm"

export default async function AdminEditPermissionsPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>
}) {
  const { id: companyId, userId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/login")

  const admin = createAdminClient()
  const [{ data: company }, { data: member }] = await Promise.all([
    admin.from("companies").select("id, name").eq("id", companyId).single(),
    admin.from("profiles").select("*").eq("id", userId).eq("company_id", companyId).single(),
  ])

  if (!company || !member) notFound()

  return (
    <div className="p-8 max-w-lg">
      <Link
        href={`/admin/companies/${companyId}/team`}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al equipo de {company.name}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Permisos</h1>
        <p className="text-sm text-slate-500 mt-1">{member.full_name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editar permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <EditAdminPermissionsForm
            companyId={companyId}
            userId={userId}
            initialPermissions={member.permissions}
          />
        </CardContent>
      </Card>
    </div>
  )
}
