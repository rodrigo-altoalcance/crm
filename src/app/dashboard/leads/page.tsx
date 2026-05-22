import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { LeadsView } from "@/components/leads/LeadsView"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function LeadsPage() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const impersonatedCompanyId = cookieStore.get("impersonated_company")?.value
  const companyId = profile.role === "super_admin" ? impersonatedCompanyId : profile.company_id
  if (!companyId) redirect("/login")

  const [{ data: stages }, { data: leads }, { data: teamMembers }] = await Promise.all([
    supabase.from("lead_stages").select("*").eq("company_id", companyId).order("position"),
    supabase.from("leads").select("*, stage:lead_stages(*), assigned_profile:profiles!assigned_to(id, full_name, avatar_url)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, avatar_url, role").eq("company_id", companyId),
  ])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">{leads?.length || 0} leads en total</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/leads/new">
            <Plus className="w-4 h-4" /> Nuevo lead
          </Link>
        </Button>
      </div>
      <LeadsView
        leads={leads || []}
        stages={stages || []}
        teamMembers={teamMembers || []}
        profile={profile}
        companyId={companyId}
      />
    </div>
  )
}
