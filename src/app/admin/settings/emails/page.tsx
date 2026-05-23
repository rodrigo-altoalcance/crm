import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import { EmailTemplateList } from "./EmailTemplateList"

export default async function EmailTemplatesPage() {
  const supabase = await createClient()
  const { data: templates } = await supabase.from("email_templates").select("*").order("created_at")

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates de email</h1>
          <p className="text-sm text-slate-500 mt-1">Templates de cobranza para enviar a empresas clientes</p>
        </div>
        <Button asChild>
          <Link href="/admin/settings/emails/new">
            <Plus className="w-4 h-4" /> Nuevo template
          </Link>
        </Button>
      </div>
      <EmailTemplateList templates={templates || []} />
    </div>
  )
}
