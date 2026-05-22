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
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
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
  )
}
