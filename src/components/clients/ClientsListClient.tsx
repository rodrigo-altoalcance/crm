"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Plus, Eye, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { NewClientModal } from "@/components/clients/NewClientModal"
import { formatCLP, formatDate } from "@/lib/utils"
import type { Company } from "@/types/database"

interface ClientRow extends Company {
  userCount: number
  lastActivity: string | null
}

export function ClientsListClient({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter((c) => c.name.toLowerCase().includes(q))
  }, [clients, search])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo cliente
        </Button>
      </div>

      {!filtered.length ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6" />}
          title={search ? "Sin resultados" : "No hay clientes registrados"}
          description={
            search
              ? "Prueba con otro nombre de empresa."
              : "Crea el primer cliente con el botón de arriba."
          }
          action={
            !search ? (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nuevo cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Usuarios activos</TableHead>
                <TableHead>Última actividad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <span className="font-medium text-slate-900">{client.name}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={client.status} />
                  </TableCell>
                  <TableCell>
                    {client.monthly_fee != null ? (
                      <span className="text-sm text-slate-700">
                        {client.currency === "CLP"
                          ? formatCLP(client.monthly_fee)
                          : `USD ${client.monthly_fee.toLocaleString("es-CL")}`}{" "}
                        / mes
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-700">{client.userCount}</span>
                  </TableCell>
                  <TableCell>
                    {client.lastActivity ? (
                      <span className="text-sm text-slate-600">{formatDate(client.lastActivity)}</span>
                    ) : (
                      <span className="text-sm text-slate-400">Sin actividad</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/clients/${client.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver ficha
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NewClientModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
