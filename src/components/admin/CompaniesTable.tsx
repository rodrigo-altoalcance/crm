"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Edit, Trash2, Eye, CreditCard, Users, LogIn } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { formatCLP } from "@/lib/utils"
import type { Company } from "@/types/database"

interface CompaniesTableProps {
  companies: (Company & { _count?: { leads: number; profiles: number } })[]
  canViewFinancials?: boolean
}

export function CompaniesTable({ companies, canViewFinancials = true }: CompaniesTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [impersonating, setImpersonating] = useState<string | null>(null)

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const res = await fetch(`/api/admin/companies/${deleteId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Empresa eliminada")
      router.refresh()
    } else {
      toast.error("Error al eliminar empresa")
    }
    setDeleting(false)
    setDeleteId(null)
  }

  async function handleImpersonate(companyId: string) {
    setImpersonating(companyId)
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId }),
    })
    if (res.ok) {
      router.push("/dashboard")
    } else {
      toast.error("Error al entrar como empresa")
      setImpersonating(null)
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            {canViewFinancials && <TableHead>Fee mensual</TableHead>}
            <TableHead>Estado</TableHead>
            <TableHead>Usuarios</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-slate-900">{company.name}</p>
                  {company.email && <p className="text-xs text-slate-500">{company.email}</p>}
                </div>
              </TableCell>
              {canViewFinancials && (
                <TableCell>
                  <span className="text-sm font-semibold text-slate-800">
                    {company.monthly_fee ? formatCLP(company.monthly_fee) : "—"}
                  </span>
                </TableCell>
              )}
              <TableCell>
                <StatusBadge status={company.status} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-slate-600">
                  {(company._count?.profiles || 0)} / {company.max_users}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/companies/${company.id}`}>
                        <Eye className="h-4 w-4 mr-2" /> Ver detalle
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/companies/${company.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" /> Editar
                      </Link>
                    </DropdownMenuItem>
                    {canViewFinancials && (
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/companies/${company.id}/payments`}>
                          <CreditCard className="h-4 w-4 mr-2" /> Pagos
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/companies/${company.id}/users`}>
                        <Users className="h-4 w-4 mr-2" /> Usuarios
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleImpersonate(company.id)}
                      disabled={impersonating === company.id}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      {impersonating === company.id ? "Entrando..." : "Entrar como empresa"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => setDeleteId(company.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="¿Eliminar empresa?"
        description="Esta acción eliminará la empresa y todos sus datos. No se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
