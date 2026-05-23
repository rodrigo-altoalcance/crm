import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { EmailTemplateForm } from "@/components/admin/EmailTemplateForm"

export default async function EditEmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: template } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single()

  if (!template) notFound()

  return (
    <div className="p-8">
      <Link
        href="/admin/settings/emails"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a templates
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Editar template</h1>
        <p className="text-sm text-slate-500 mt-1">{template.name}</p>
      </div>
      <EmailTemplateForm template={template} />
    </div>
  )
}
