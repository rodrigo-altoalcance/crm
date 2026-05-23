import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { EmailTemplateForm } from "@/components/admin/EmailTemplateForm"

export default function NewEmailTemplatePage() {
  return (
    <div className="p-8">
      <Link
        href="/admin/settings/emails"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a templates
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo template de email</h1>
        <p className="text-sm text-slate-500 mt-1">Crea un template de cobranza para enviar a empresas clientes</p>
      </div>
      <EmailTemplateForm />
    </div>
  )
}
