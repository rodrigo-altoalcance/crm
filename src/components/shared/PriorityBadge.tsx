import { Badge } from "@/components/ui/badge"
import type { TaskPriority } from "@/types/database"

const labels: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
}

const variants: Record<TaskPriority, "secondary" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "warning",
  high: "destructive",
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={variants[priority]}>{labels[priority]}</Badge>
}
