import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"
import { isAgencyStaff } from "@/lib/auth/roles"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { TopBar } from "@/components/shared/TopBar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)

  if (!profile || !isAgencyStaff(profile)) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar role={profile.role} />
      <div className="flex-1 flex flex-col overflow-auto">
        <TopBar userName={profile.full_name} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
