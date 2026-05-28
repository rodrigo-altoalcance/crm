import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Phone, Mail, Calendar } from "lucide-react"
import { formatDate, formatScheduledAt } from "@/lib/utils"
import type { Lead } from "@/types/database"

const sourceLabels: Record<string, { label: string; color: string }> = {
  meta: { label: "Meta", color: "info" },
  calendly: { label: "Calendly", color: "warning" },
  manual: { label: "Manual", color: "secondary" },
}

export function LeadCard({ lead, basePath = "/dashboard/leads" }: { lead: Lead; basePath?: string }) {
  const source = sourceLabels[lead.source] || sourceLabels.manual
  const lastComment = (lead as any).last_comment as string | null | undefined

  return (
    <Link href={`${basePath}/${lead.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-150 cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            {lead.first_name} {lead.last_name}
          </p>
          <Badge variant={source.color as any} className="flex-shrink-0 text-xs">
            {source.label}
          </Badge>
        </div>

        {lastComment && (
          <p className="text-xs text-slate-500 mb-2 line-clamp-2 leading-snug">{lastComment}</p>
        )}

        <div className="space-y-1 mb-3">
          {lead.email && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Mail className="w-3 h-3" /> {lead.email}
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone className="w-3 h-3" /> {lead.phone}
            </div>
          )}
          {lead.scheduled_at && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
              <Calendar className="w-3 h-3" /> Fecha agenda: {formatScheduledAt(lead.scheduled_at)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="w-3 h-3" />
            {formatDate(lead.created_at)}
          </div>
          {(lead as any).assigned_profile && (
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-[10px]">
                {(lead as any).assigned_profile.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </Link>
  )
}
