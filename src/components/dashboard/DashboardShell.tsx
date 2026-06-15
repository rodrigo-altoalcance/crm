"use client"

import { useState } from "react"
import { DashboardSidebar } from "./DashboardSidebar"
import { TopBar } from "@/components/shared/TopBar"
import { ImpersonationBanner } from "./ImpersonationBanner"

interface DashboardShellProps {
  children: React.ReactNode
  userName: string
  companyName: string
  isImpersonating: boolean
}

export function DashboardShell({ children, userName, companyName, isImpersonating }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar
        companyName={companyName}
        isImpersonating={isImpersonating}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {isImpersonating && <ImpersonationBanner companyName={companyName} />}
        <TopBar userName={userName} onMenuOpen={() => setMobileMenuOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
