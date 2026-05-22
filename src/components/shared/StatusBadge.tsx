import { Badge } from "@/components/ui/badge"
import type { CompanyStatus } from "@/types/database"

const labels: Record<CompanyStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  trial: "Trial",
}

const variants: Record<CompanyStatus, "success" | "destructive" | "warning"> = {
  active: "success",
  inactive: "destructive",
  trial: "warning",
}

export function StatusBadge({ status }: { status: CompanyStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
