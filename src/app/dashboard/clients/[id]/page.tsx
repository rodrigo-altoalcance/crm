import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClientRecordsPanel } from "@/components/clients/ClientRecordsPanel"
import { formatDate } from "@/lib/utils"

const sourceLabels: Record<string, string> = {
  meta: "Meta",
  calendly: "Calendly",
  manual: "Manual",
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const companyId =
    profile.role === "super_admin"
      ? cookieStore.get("impersonated_company")?.value
      : profile.company_id
  if (!companyId) redirect("/login")

  const [{ data: lead }, { data: records }] = await Promise.all([
    supabase
      .from("leads")
      .select("*, stage:lead_stages(*), assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
      .eq("id", id)
      .eq("company_id", companyId)
      .single(),
    supabase
      .from("client_records")
      .select("*, profile:profiles(full_name, avatar_url)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ])

  if (!lead) notFound()

  return (
    <div className="p-8">
      <Link
        href="/dashboard/clients"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a Clientes
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-xl">
                  {lead.first_name} {lead.last_name}
                </CardTitle>
                <Badge
                  variant={
                    lead.source === "meta"
                      ? "info"
                      : lead.source === "calendly"
                      ? "warning"
                      : "secondary"
                  }
                >
                  {sourceLabels[lead.source]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {lead.email}
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {lead.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                Cerrado el {formatDate(lead.updated_at)}
              </div>

              {lead.stage && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Etapa
                  </p>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: lead.stage.color }}
                    />
                    <span className="text-sm">{lead.stage.name}</span>
                  </span>
                </div>
              )}

              {(lead as any).assigned_profile && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Asignado a
                  </p>
                  <span className="text-sm text-slate-700">
                    {(lead as any).assigned_profile.full_name}
                  </span>
                </div>
              )}

              {lead.message && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Mensaje
                  </p>
                  <p className="text-sm text-slate-600">{lead.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <ClientRecordsPanel
            leadId={id}
            companyId={companyId}
            records={records || []}
          />
        </div>
      </div>
    </div>
  )
}
