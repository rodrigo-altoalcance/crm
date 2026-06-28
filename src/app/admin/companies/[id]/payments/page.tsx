import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { formatDate } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PaymentsPageClient } from "./PaymentsPageClient"
import type { Payment } from "@/types/database"

export default async function CompanyPaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") redirect("/admin")

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", id)
    .single()

  if (!company) notFound()

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("company_id", id)
    .order("paid_at", { ascending: false })

  function formatAmount(amount: number, currency: string) {
    if (currency === "USD") {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(amount)
    }
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount)
  }

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
            <h1 className="text-2xl font-bold text-slate-900">Historial de pagos</h1>
            <p className="text-sm text-slate-500 mt-1">{company.name}</p>
          </div>
          <PaymentsPageClient companyId={id} />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {payments && payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Registrado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments as Payment[]).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {formatDate(payment.paid_at)}
                  </TableCell>
                  <TableCell>
                    {formatAmount(payment.amount, payment.currency)}
                  </TableCell>
                  <TableCell>{payment.currency}</TableCell>
                  <TableCell className="text-slate-500">
                    {payment.notes || "—"}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs font-mono">
                    {payment.recorded_by.slice(0, 8)}…
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <p className="text-sm">No hay pagos registrados para esta empresa.</p>
          </div>
        )}
      </div>
    </div>
  )
}
