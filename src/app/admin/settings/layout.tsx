import { AdminSettingsNav } from "./AdminSettingsNav"

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSettingsNav />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
