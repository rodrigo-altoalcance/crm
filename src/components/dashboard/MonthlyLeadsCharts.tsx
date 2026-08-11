"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type MonthDatum = {
  key: string
  label: string
  leads_created: number
  leads_closed: number
}

const PERIODS = [
  { label: "3 meses", value: 3 },
  { label: "6 meses", value: 6 },
  { label: "9 meses", value: 9 },
  { label: "12 meses", value: 12 },
]

function CustomTooltip({ active, payload, label, valueKey, valueLabel }: any) {
  if (!active || !payload?.length) return null
  const value = (payload.find((p: any) => p.dataKey === valueKey)?.value as number) || 0
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      <p className="text-slate-600">
        {valueLabel}: <span className="font-medium">{value}</span>
      </p>
    </div>
  )
}

function MonthlyChart({
  title,
  data,
  loading,
  dataKey,
  valueLabel,
  color,
}: {
  title: string
  data: MonthDatum[]
  loading: boolean
  dataKey: "leads_created" | "leads_closed"
  valueLabel: string
  color: string
}) {
  const hasData = data.some((d) => (d[dataKey] || 0) > 0)

  return (
    <div className="bg-white rounded-xl border p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">{title}</h3>
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
      ) : !hasData ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          No hay datos en este período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={264}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip valueKey={dataKey} valueLabel={valueLabel} />} />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} name={dataKey} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export function MonthlyLeadsCharts() {
  const [months, setMonths] = useState(6)
  const [data, setData] = useState<MonthDatum[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard/leads-monthly?months=${months}`)
      .then((r) => r.json())
      .then((d) => {
        setData(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [months])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tendencia mensual</h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setMonths(p.value)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                months === p.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MonthlyChart
          title="Leads por mes"
          data={data}
          loading={loading}
          dataKey="leads_created"
          valueLabel="Leads"
          color="#6366f1"
        />
        <MonthlyChart
          title="Clientes cerrados por mes"
          data={data}
          loading={loading}
          dataKey="leads_closed"
          valueLabel="Cerrados"
          color="#10b981"
        />
      </div>
    </div>
  )
}
