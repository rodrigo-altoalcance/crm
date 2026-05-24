import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { formatCLP, formatDate } from "@/lib/utils"
import { Edit, CreditCard, Users, LogIn, ArrowLeft, Webhook } from "lucide-react"
import ImpersonateButton from "./ImpersonateButton"

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single()

  if (!company) notFound()

  const [{ count: leadsCount }, { count: usersCount }, { data: recentPayments }] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("company_id", id),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", id),
    supabase.from("payments").select("*").eq("company_id", id).order("paid_at", { ascending: false }).limit(3),
  ])

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/companies" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver a Usuarios Empresa
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={company.status} />
              {company.email && <span className="text-sm text-slate-500">{company.email}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <ImpersonateButton companyId={id} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/companies/${id}/edit`}>
                <Edit className="w-4 h-4" /> Editar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fee mensual</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {company.monthly_fee ? formatCLP(company.monthly_fee) : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total leads</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{leadsCount || 0}</p>
        </div>
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usuarios</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{usersCount || 0} / {company.max_users}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Últimos pagos</h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/companies/${id}/payments`}>
                <CreditCard className="w-4 h-4" /> Ver todos
              </Link>
            </Button>
          </div>
          {recentPayments && recentPayments.length > 0 ? (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-slate-600">{formatDate(p.paid_at)}</span>
                  <span className="text-sm font-semibold text-slate-800">{formatCLP(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No hay pagos registrados</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Acciones rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href={`/admin/companies/${id}/payments`}>
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <span className="text-xs">Pagos</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href={`/admin/companies/${id}/users`}>
                <Users className="w-5 h-5 text-indigo-600" />
                <span className="text-xs">Usuarios</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href={`/admin/companies/${id}/integrations`}>
                <Webhook className="w-5 h-5 text-indigo-600" />
                <span className="text-xs">Integraciones</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
