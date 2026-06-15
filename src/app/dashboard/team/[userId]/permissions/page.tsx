import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EditPermissionsForm } from "./EditPermissionsForm"

export default async function EditPermissionsPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  if (profile.role !== "company_admin" && profile.role !== "super_admin") {
    redirect("/dashboard/team")
  }

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) redirect("/login")

  const { data: member } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("company_id", companyId)
    .single()

  if (!member) notFound()

  return (
    <div className="p-4 md:p-8 max-w-lg">
      <Link
        href="/dashboard/team"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al equipo
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
          <EditPermissionsForm userId={userId} initialPermissions={member.permissions} />
        </CardContent>
      </Card>
    </div>
  )
}
