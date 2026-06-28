"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/shared/StatusBadge"
import type { CompanyStatus } from "@/types/database"

type RankingItem = {
  id: string
  name: string
  status: string
  lead_activities_count: number
  agency_activities_count: number
  total: number
}

export function ActivityRankingWidget() {
  const [data, setData] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/dashboard/activity-ranking")
      .then((r) => r.json())
      .then((d) => {
        setData(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const max = data[0]?.total || 1

  return (
    <div className="bg-white rounded-xl border p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
        Ranking de clientes por actividad
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-slate-500">No hay actividad registrada</p>
      ) : (
        <ol className="space-y-3">
          {data.map((item, idx) => (
            <li key={item.id} className="flex items-center gap-3">
              <span className="w-5 text-xs font-bold text-slate-400 text-right shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-800 truncate">{item.name}</span>
                  <StatusBadge status={item.status as CompanyStatus} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${(item.total / max) * 100}%` }}
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-slate-900">{item.total}</span>
                    <div className="flex gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{item.lead_activities_count} en leads</span>
                      <span>{item.agency_activities_count} en cuenta</span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
