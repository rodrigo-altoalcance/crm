import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Mail, Sparkles, Edit, UserPlus } from "lucide-react"
import { EmailTemplateList } from "./EmailTemplateList"

export default async function EmailTemplatesPage() {
  const supabase = await createClient()
  const { data: templates } = await supabase.from("email_templates").select("*").order("created_at")

  const welcomeTemplate = templates?.find((t) => t.type === "welcome" && t.is_default)
  const invitationTemplate = templates?.find((t) => t.type === "invitation" && t.is_default)
  const billingTemplates = templates?.filter((t) => t.type === "billing") ?? []

  return (
    <div className="p-8 space-y-10">
      {/* Welcome template section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Template de Bienvenida</h2>
            </div>
            <p className="text-sm text-slate-500">
              Template de referencia para bienvenida a nuevos usuarios empresa.
            </p>
          </div>
        </div>

        {welcomeTemplate ? (
          <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">{welcomeTemplate.name}</h3>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Bienvenida</Badge>
                <Badge variant="info">Por defecto</Badge>
              </div>
              <p className="text-sm text-slate-500">{welcomeTemplate.subject}</p>
              <p className="text-xs text-slate-400 mt-2">
                Variables: <code className="font-mono bg-slate-100 px-1 rounded">{"{{nombre_empresa}}"}</code>{" "}
                <code className="font-mono bg-slate-100 px-1 rounded">{"{{email}}"}</code>{" "}
                <code className="font-mono bg-slate-100 px-1 rounded">{"{{link_verificacion}}"}</code>
              </p>
            </div>
            <Button asChild variant="ghost" size="icon" className="ml-4">
              <Link href={`/admin/settings/emails/${welcomeTemplate.id}/edit`}>
                <Edit className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Template de bienvenida no encontrado</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Ejecuta la migración <code className="font-mono">003_welcome_email_template.sql</code> en Supabase para crearlo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invitation template section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Template de Invitación</h2>
            </div>
            <p className="text-sm text-slate-500">
              Se envía al invitar colaboradores al equipo o crear nuevos usuarios empresa. El destinatario hace clic para establecer su contraseña.
            </p>
          </div>
        </div>

        {invitationTemplate ? (
          <div className="bg-white rounded-xl border border-indigo-200 p-5 shadow-sm flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">{invitationTemplate.name}</h3>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">Invitación</Badge>
                <Badge variant="info">Por defecto</Badge>
              </div>
              <p className="text-sm text-slate-500">{invitationTemplate.subject}</p>
              <p className="text-xs text-slate-400 mt-2">
                Variables:{" "}
                <code className="font-mono bg-slate-100 px-1 rounded">{"{{nombre_invitado}}"}</code>{" "}
                <code className="font-mono bg-slate-100 px-1 rounded">{"{{nombre_empresa}}"}</code>{" "}
                <code className="font-mono bg-slate-100 px-1 rounded">{"{{link_invitacion}}"}</code>
              </p>
            </div>
            <Button asChild variant="ghost" size="icon" className="ml-4">
              <Link href={`/admin/settings/emails/${invitationTemplate.id}/edit`}>
                <Edit className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Template de invitación no encontrado</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Ejecuta la migración <code className="font-mono">005_invitation_email_template.sql</code> en Supabase para crearlo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Billing templates section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Templates de Cobranza</h2>
            <p className="text-sm text-slate-500">Templates para enviar recordatorios de pago a empresas clientes.</p>
          </div>
          <Button asChild>
            <Link href="/admin/settings/emails/new">
              <Plus className="w-4 h-4" /> Nuevo template
            </Link>
          </Button>
        </div>
        <EmailTemplateList templates={billingTemplates} />
      </div>
    </div>
  )
}
