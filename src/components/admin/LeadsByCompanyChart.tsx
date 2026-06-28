"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

type DataItem = {
  company_id: string
  company_name: string
  leads_open: number
  leads_closed: number
}

const PERIODS = [
  { label: "7 días", value: 7 },
  { label: "15 días", value: 15 },
  { label: "30 días", value: 30 },
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const open = (payload.find((p: any) => p.dataKey === "leads_open")?.value as number) || 0
  const closed = (payload.find((p: any) => p.dataKey === "leads_closed")?.value as number) || 0
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      <p className="text-indigo-600">Abiertos: {open}</p>
      <p className="text-emerald-600">Cerrados: {closed}</p>
      <p className="text-slate-600 font-medium mt-1 pt-1 border-t border-slate-100">
        Total: {open + closed}
      </p>
    </div>
  )
}

function legendFormatter(value: string) {
  return value === "leads_open" ? "Abiertos" : "Cerrados"
}

export function LeadsByCompanyChart() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<DataItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/dashboard/leads-by-company?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        setData(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [days])

  return (
    <div className="bg-white rounded-xl border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Leads por cliente
        </h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                days === p.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Cargando...
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          No hay leads en este período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={264}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: -8, bottom: data.length > 4 ? 48 : 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="company_name"
              tick={{ fontSize: 11, fill: "#64748b" }}
              angle={data.length > 4 ? -35 : 0}
              textAnchor={data.length > 4 ? "end" : "middle"}
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={legendFormatter} iconType="square" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="leads_open" stackId="a" fill="#6366f1" name="leads_open" />
            <Bar dataKey="leads_closed" stackId="a" fill="#10b981" name="leads_closed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
