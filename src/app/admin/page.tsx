import { createClient } from "@/lib/supabase/server"
import { StatCard } from "@/components/admin/StatCard"
import { formatCLP, formatDate } from "@/lib/utils"
import { Building2, Users, Zap, CreditCard } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { data: companies },
    { count: totalLeads },
    { count: closedLeads },
    { data: recentPayments },
    { data: upcomingPayments },
  ] = await Promise.all([
    supabase.from("companies").select("id, name, status, monthly_fee, currency, next_payment_date").eq("status", "active"),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true })
      .in("stage_id", supabase.from("lead_stages").select("id").eq("is_final", true) as any),
    supabase.from("payments").select("*, company:companies(name)").order("paid_at", { ascending: false }).limit(5),
    supabase.from("companies")
      .select("id, name, monthly_fee, currency, next_payment_date")
      .not("next_payment_date", "is", null)
      .order("next_payment_date", { ascending: true })
      .limit(5),
  ])

  const monthlyRevenue = companies?.reduce((sum, c) => sum + (c.monthly_fee || 0), 0) || 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Resumen general de Alto Alcance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Empresas activas"
          value={companies?.length || 0}
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatCard
          title="Ingresos mensuales"
          value={formatCLP(monthlyRevenue)}
          icon={<CreditCard className="w-5 h-5" />}
        />
        <StatCard
          title="Total leads"
          value={totalLeads || 0}
          icon={<Zap className="w-5 h-5" />}
        />
        <StatCard
          title="Leads cerrados"
          value={closedLeads || 0}
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
            Próximos pagos
          </h2>
          {upcomingPayments && upcomingPayments.length > 0 ? (
            <div className="space-y-3">
              {upcomingPayments.map((company) => (
                <Link
                  key={company.id}
                  href={`/admin/clients`}
                  className="flex items-center justify-between py-2 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-800">{company.name}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCLP(company.monthly_fee || 0)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {company.next_payment_date ? formatDate(company.next_payment_date) : "Sin fecha"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No hay pagos próximos</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
            Últimos pagos registrados
          </h2>
          {recentPayments && recentPayments.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{payment.company?.name}</p>
                    <p className="text-xs text-slate-500">{formatDate(payment.paid_at)}</p>
                  </div>
                  <Badge variant="success">{formatCLP(payment.amount)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No hay pagos registrados</p>
          )}
        </div>
      </div>
    </div>
  )
}
