"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { History, MessageSquare, CheckSquare, Settings } from "lucide-react"
import type { LeadActivity } from "@/types/database"

interface LeadHistoryPanelProps {
  activities: LeadActivity[]
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ActivityRow({ activity }: { activity: LeadActivity }) {
  const meta = activity.metadata as Record<string, string | null>
  const author = (activity as any).profile?.full_name ?? "Sistema"

  if (activity.type === "stage_changed" || activity.type === "lead_closed") {
    const hasStageInfo = meta?.from_stage_name || meta?.to_stage_name

    if (hasStageInfo) {
      return (
        <div className="flex gap-3 py-3 border-b last:border-0">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {meta.from_stage_name && (
                <span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{meta.from_stage_name}</span>
              )}
              {meta.from_stage_name && meta.to_stage_name && (
                <span className="text-xs text-slate-400">→</span>
              )}
              {meta.to_stage_name && (
                <span className="text-xs bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5 font-medium">{meta.to_stage_name}</span>
              )}
            </div>
            <p className="text-sm text-slate-800">{activity.description}</p>
            <p className="text-xs text-slate-400 mt-1">{author} · {formatDateTime(activity.created_at)}</p>
          </div>
        </div>
      )
    }
  }

  if (activity.type === "task_completed") {
    return (
      <div className="flex gap-3 py-3 border-b last:border-0">
        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <CheckSquare className="w-3.5 h-3.5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">Tarea completada: {activity.description}</p>
          {meta?.closing_comment && (
            <p className="text-sm text-slate-600 mt-1 italic">"{meta.closing_comment}"</p>
          )}
          <p className="text-xs text-slate-400 mt-1">{author} · {formatDateTime(activity.created_at)}</p>
        </div>
      </div>
    )
  }

  // System activity (lead_created, task_created, note_added, legacy stage_changed, etc.)
  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Settings className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">{activity.description}</p>
        <p className="text-xs text-slate-400 mt-1">{author} · {formatDateTime(activity.created_at)}</p>
      </div>
    </div>
  )
}

export function LeadHistoryPanel({ activities }: LeadHistoryPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
          <History className="w-4 h-4" /> Historial
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Sin actividad registrada</p>
        ) : (
          <div>
            {activities.map((act) => (
              <ActivityRow key={act.id} activity={act} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
