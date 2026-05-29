"use client"

import { useState, useMemo } from "react"
import { LayoutGrid, List, Search, Columns3 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { LeadsKanban } from "./LeadsKanban"
import { LeadsTable } from "./LeadsTable"
import type { Lead, LeadStage, Profile, CustomLeadField } from "@/types/database"

interface LeadsViewProps {
  leads: Lead[]
  stages: LeadStage[]
  teamMembers: Pick<Profile, "id" | "full_name" | "avatar_url">[]
  profile: Profile
  companyId: string
  basePath?: string
  apiPrefix?: string
  customFields?: CustomLeadField[]
  initialColumnPrefs?: Record<string, boolean>
  fieldValuesMap?: Record<string, Record<string, string>>
  columnPrefsApiPrefix?: string
}

export function LeadsView({
  leads, stages, teamMembers, profile, companyId,
  basePath = "/dashboard/leads", apiPrefix = "/api",
  customFields = [], initialColumnPrefs = {}, fieldValuesMap = {},
  columnPrefsApiPrefix,
}: LeadsViewProps) {
  const [view, setView] = useState<"kanban" | "table">("kanban")
  const [search, setSearch] = useState("")
  const [columnPrefs, setColumnPrefs] = useState<Record<string, boolean>>(initialColumnPrefs)

  const visibleCustomFieldIds = customFields.filter((f) => columnPrefs[f.id] === true).map((f) => f.id)

  async function handleToggleColumn(fieldId: string, visible: boolean) {
    setColumnPrefs((prev) => ({ ...prev, [fieldId]: visible }))
    if (!columnPrefsApiPrefix) return
    await fetch(`${columnPrefsApiPrefix}/column-preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_key: fieldId, visible }),
    })
  }

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

        {view === "table" && customFields.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 ml-1">
                <Columns3 className="w-4 h-4 mr-1.5" /> Columnas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Columnas personalizadas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {customFields.map((f) => (
                <DropdownMenuCheckboxItem
                  key={f.id}
                  checked={columnPrefs[f.id] === true}
                  onCheckedChange={(checked) => handleToggleColumn(f.id, checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {f.nombre}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {view === "kanban" ? (
        <LeadsKanban leads={filteredLeads} stages={stages} profile={profile} companyId={companyId} basePath={basePath} apiPrefix={apiPrefix} />
      ) : (
        <LeadsTable
        leads={filteredLeads}
        stages={stages}
        teamMembers={teamMembers}
        basePath={basePath}
        apiPrefix={apiPrefix}
        customFields={customFields}
        visibleCustomFieldIds={visibleCustomFieldIds}
        fieldValuesMap={fieldValuesMap}
      />
      )}
    </div>
  )
}
