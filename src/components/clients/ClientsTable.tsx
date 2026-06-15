"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import type { Lead } from "@/types/database"



interface ClientWithCount extends Lead {
  client_records_count: number
}

interface ClientsTableProps {
  clients: ClientWithCount[]
  companyId: string
}

export function ClientsTable({ clients }: ClientsTableProps) {
  return (
    <>
      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {clients.map((client) => (
          <Link href={`/dashboard/clients/${client.id}`} key={client.id}>
            <div className="bg-white rounded-xl border shadow-sm p-4 hover:border-indigo-200 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {client.first_name} {client.last_name}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">{client.email}</p>
                  {client.phone && <p className="text-sm text-slate-500">{client.phone}</p>}
                </div>
                {client.client_records_count > 0 && (
                  <Badge variant="info" className="flex-shrink-0">{client.client_records_count}</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">Cerrado el {formatDate(client.updated_at)}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Fecha de cierre</TableHead>
              <TableHead>Registros</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="font-medium text-slate-900 hover:text-indigo-600"
                  >
                    {client.first_name} {client.last_name}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600">{client.email}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-500">{client.phone || "—"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-500">{formatDate(client.updated_at)}</span>
                </TableCell>
                <TableCell>
                  {client.client_records_count > 0 ? (
                    <Badge variant="info">{client.client_records_count}</Badge>
                  ) : (
                    <span className="text-slate-400 text-sm">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
