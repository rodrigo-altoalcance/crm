import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar"
import { ImpersonationBanner } from "@/components/dashboard/ImpersonationBanner"
import { TopBar } from "@/components/shared/TopBar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)

  if (!profile) redirect("/login")

  const cookieStore = await cookies()
  const impersonatedCompanyId = cookieStore.get("impersonated_company")?.value

  let companyId = profile.company_id
  let isImpersonating = false
  let companyName = ""

  if (profile.role === "super_admin") {
    if (!impersonatedCompanyId) redirect("/admin")
    companyId = impersonatedCompanyId
    isImpersonating = true
  }

  if (companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single()
    companyName = company?.name || ""
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar companyName={companyName} isImpersonating={isImpersonating} />
      <div className="flex-1 flex flex-col overflow-auto">
        {isImpersonating && <ImpersonationBanner companyName={companyName} />}
        <TopBar userName={profile.full_name} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
