import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatDate } from "@/lib/utils"
import { Users } from "lucide-react"

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string }>
}) {
  const { company_id } = await searchParams
  const supabase = await createClient()

  const { data: finalStages } = await supabase
    .from("lead_stages")
    .select("id")
    .eq("is_final", true)

  const finalStageIds = finalStages?.map((s) => s.id) || []

  let query = supabase
    .from("leads")
    .select("*, stage:lead_stages(name, color), company:companies(id, name, monthly_fee, currency, payment_day, next_payment_date)")
    .in("stage_id", finalStageIds.length ? finalStageIds : ["__none__"])
    .order("updated_at", { ascending: false })

  if (company_id) {
    query = query.eq("company_id", company_id)
  }

  const { data: leads } = await query
  const { data: companies } = await supabase.from("companies").select("id, name").order("name")

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="text-sm text-slate-500 mt-1">Leads cerrados — gestión de pagos por empresa</p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          href="/admin/clients"
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${!company_id ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
        >
          Todos
        </Link>
        {companies?.map((c) => (
          <Link
            key={c.id}
            href={`/admin/clients?company_id=${c.id}`}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${company_id === c.id ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {!leads?.length ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No hay clientes cerrados"
          description="Los leads cerrados aparecerán aquí automáticamente."
        />
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Fecha cierre</TableHead>
                <TableHead>Pagos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead: any) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/admin/clients/${lead.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {lead.first_name} {lead.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-700">{lead.company?.name}</span>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-slate-600">{lead.email}</p>
                    {lead.phone && <p className="text-xs text-slate-400">{lead.phone}</p>}
                  </TableCell>
                  <TableCell>
                    {lead.stage && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lead.stage.color }} />
                        <span className="text-sm">{lead.stage.name}</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-500">{formatDate(lead.updated_at)}</span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/clients/${lead.id}`}>
                      <Badge variant={lead.company?.next_payment_date ? "warning" : "secondary"} className="cursor-pointer hover:opacity-80">
                        {lead.company?.next_payment_date ? "Ver pagos" : "Configurar"}
                      </Badge>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
