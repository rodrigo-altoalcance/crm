import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { CompanyForm } from "@/components/admin/CompanyForm"

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: company } = await supabase.from("companies").select("*").eq("id", id).single()
  if (!company) notFound()
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Editar empresa</h1>
        <p className="text-sm text-slate-500 mt-1">{company.name}</p>
      </div>
      <CompanyForm company={company} />
    </div>
  )
}
