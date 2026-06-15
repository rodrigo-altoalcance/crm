import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

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
    <DashboardShell
      userName={profile.full_name}
      companyName={companyName}
      isImpersonating={isImpersonating}
    >
      {children}
    </DashboardShell>
  )
}
