import { createClient } from "@/lib/supabase/server"
import { CompaniesTable } from "@/components/admin/CompaniesTable"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/EmptyState"
import Link from "next/link"
import { Plus, Building2 } from "lucide-react"

export default async function CompaniesPage() {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false })

  const companiesWithCounts = await Promise.all(
    (companies || []).map(async (company) => {
      const [{ count: profilesCount }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", company.id),
      ])
      return { ...company, _count: { leads: 0, profiles: profilesCount || 0 } }
    })
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuario Empresa</h1>
          <p className="text-sm text-slate-500 mt-1">
            {companies?.length || 0} usuario{companies?.length !== 1 ? "s" : ""} empresa registrado{companies?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/companies/new">
            <Plus className="w-4 h-4" /> Nuevo usuario empresa
          </Link>
        </Button>
      </div>

      {companiesWithCounts.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6" />}
          title="No hay usuarios empresa registrados"
          description="Crea tu primer usuario empresa para comenzar a gestionar leads."
          action={
            <Button asChild>
              <Link href="/admin/companies/new">
                <Plus className="w-4 h-4" /> Nuevo usuario empresa
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <CompaniesTable companies={companiesWithCounts} />
        </div>
      )}
    </div>
  )
}
