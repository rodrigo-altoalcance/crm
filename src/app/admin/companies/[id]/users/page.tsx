import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InviteUserForm } from "@/components/admin/InviteUserForm"
import type { Profile } from "@/types/database"

const ROLE_LABELS: Record<string, string> = {
  company_admin: "Administrador",
  seller: "Vendedor",
  super_admin: "Super Admin",
}

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

  const users = (profiles || []) as Profile[]

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
          {users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Miembro desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500">{user.phone || "—"}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {new Intl.DateTimeFormat("es-CL", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(user.created_at))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No hay usuarios en esta empresa.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
            Invitar usuario
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
