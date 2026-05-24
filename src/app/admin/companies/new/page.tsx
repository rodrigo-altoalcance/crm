import { CompanyForm } from "@/components/admin/CompanyForm"

export default function NewCompanyPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo Usuario Empresa</h1>
        <p className="text-sm text-slate-500 mt-1">Registra un nuevo usuario empresa cliente</p>
      </div>
      <CompanyForm />
    </div>
  )
}
