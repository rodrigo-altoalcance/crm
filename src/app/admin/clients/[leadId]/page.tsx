import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ClientPaymentPanel } from "@/components/admin/ClientPaymentPanel"
import { formatDate } from "@/lib/utils"
import { StatusBadge } from "@/components/shared/StatusBadge"

export default async function AdminClientDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from("leads")
    .select("*, stage:lead_stages(*), company:companies(*)")
    .eq("id", leadId)
    .single()

  if (!lead) notFound()

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("company_id", lead.company_id)
    .order("paid_at", { ascending: false })

  return (
    <div className="p-8">
      <Link href="/admin/clients" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver a Clientes
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">{lead.first_name} {lead.last_name}</h2>
              <Badge variant="success">Cerrado</Badge>
            </div>
            <div className="space-y-2">
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" /> {lead.email}
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" /> {lead.phone}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-slate-500 mb-1">Empresa</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{(lead as any).company?.name}</span>
                {(lead as any).company?.status && <StatusBadge status={(lead as any).company.status} />}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-1">Fecha de cierre</p>
              <p className="text-sm text-slate-700">{formatDate(lead.updated_at)}</p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Pagos de la empresa</h2>
            <ClientPaymentPanel company={(lead as any).company} payments={payments || []} />
          </div>
        </div>
      </div>
    </div>
  )
}
