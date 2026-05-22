"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { formatDate } from "@/lib/utils"
import { Calendar, Link as LinkIcon } from "lucide-react"
import type { Task } from "@/types/database"

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-slate-900 text-sm leading-snug">{task.title}</h3>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
        {task.due_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(task.due_date)}
          </span>
        )}

        {(task as any).lead && (
          <span className="flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            {(task as any).lead.first_name} {(task as any).lead.last_name}
          </span>
        )}

        {(task as any).assigned_profile && (
          <span className="flex items-center gap-1 ml-auto">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-600">
                {(task as any).assigned_profile.full_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span>{(task as any).assigned_profile.full_name}</span>
          </span>
        )}
      </div>
    </div>
  )
}
