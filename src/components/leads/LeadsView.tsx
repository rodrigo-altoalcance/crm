"use client"

import { useState } from "react"
import { LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LeadsKanban } from "./LeadsKanban"
import { LeadsTable } from "./LeadsTable"
import type { Lead, LeadStage, Profile } from "@/types/database"

interface LeadsViewProps {
  leads: Lead[]
  stages: LeadStage[]
  teamMembers: Pick<Profile, "id" | "full_name" | "avatar_url">[]
  profile: Profile
  companyId: string
  basePath?: string
  apiPrefix?: string
}

export function LeadsView({ leads, stages, teamMembers, profile, companyId, basePath = "/dashboard/leads", apiPrefix = "/api" }: LeadsViewProps) {
  const [view, setView] = useState<"kanban" | "table">("kanban")

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="flex rounded-lg border bg-white p-1 shadow-sm">
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === "kanban" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Kanban
          </button>
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === "table" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <List className="w-4 h-4" /> Lista
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <LeadsKanban leads={leads} stages={stages} profile={profile} companyId={companyId} basePath={basePath} apiPrefix={apiPrefix} />
      ) : (
        <LeadsTable leads={leads} stages={stages} teamMembers={teamMembers} basePath={basePath} apiPrefix={apiPrefix} />
      )}
    </div>
  )
}
