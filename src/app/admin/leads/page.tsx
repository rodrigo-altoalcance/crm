import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatDate } from "@/lib/utils"
import { Plus, Zap } from "lucide-react"

const sourceColors: Record<string, "info" | "warning" | "secondary"> = {
  meta: "info",
  calendly: "warning",
  manual: "secondary",
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string }>
}) {
  const { company_id } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("leads")
    .select("*, stage:lead_stages(name, color, is_final), company:companies(name)")
    .order("created_at", { ascending: false })

  if (company_id) {
    query = query.eq("company_id", company_id)
  }

  const { data: leads } = await query
  const { data: companies } = await supabase.from("companies").select("id, name").order("name")

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">
            {leads?.length || 0} leads {company_id ? "filtrados" : "en total"}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/leads/new">
            <Plus className="w-4 h-4" /> Nuevo lead
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/leads"
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${!company_id ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
        >
          Todos
        </Link>
        {companies?.map((c) => (
          <Link
            key={c.id}
            href={`/admin/leads?company_id=${c.id}`}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${company_id === c.id ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {!leads?.length ? (
        <EmptyState
          icon={<Zap className="w-6 h-6" />}
          title="No hay leads"
          description="Aún no hay leads en el sistema."
        />
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead: any) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {lead.first_name} {lead.last_name}
                    </Link>
                    <p className="text-xs text-slate-500">{lead.email}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-700">{lead.company?.name || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sourceColors[lead.source] || "secondary"}>{lead.source}</Badge>
                  </TableCell>
                  <TableCell>
                    {lead.stage && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lead.stage.color }} />
                        <span className="text-sm">{lead.stage.name}</span>
                        {lead.stage.is_final && <Badge variant="success" className="text-xs">Cerrado</Badge>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-500">{formatDate(lead.created_at)}</span>
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
