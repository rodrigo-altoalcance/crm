"use client"

import { useState, useMemo } from "react"
import { LayoutGrid, List, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
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
  const [search, setSearch] = useState("")

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leads
    return leads.filter((l) => {
      const name = `${l.first_name} ${l.last_name}`.toLowerCase()
      const email = (l.email || "").toLowerCase()
      const phone = (l.phone || "").toLowerCase()
      return name.includes(q) || email.includes(q) || phone.includes(q)
    })
  }, [leads, search])

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

        <div className="relative ml-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lead..."
            className="pl-8 h-9 w-56 bg-white text-sm"
          />
        </div>
      </div>

      {view === "kanban" ? (
        <LeadsKanban leads={filteredLeads} stages={stages} profile={profile} companyId={companyId} basePath={basePath} apiPrefix={apiPrefix} />
      ) : (
        <LeadsTable leads={filteredLeads} stages={stages} teamMembers={teamMembers} basePath={basePath} apiPrefix={apiPrefix} />
      )}
    </div>
  )
}
