"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CalendarDays, CheckCircle, Unlink } from "lucide-react"

interface CalendarStatus {
  connected: boolean
  calendarId: string | null
  calendarName: string | null
  email: string | null
}

interface CalendarOption {
  id: string
  name: string
  primary: boolean
}

interface GoogleCalendarCardProps {
  returnTo?: string
}

export function GoogleCalendarCard({ returnTo }: GoogleCalendarCardProps) {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("")
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [savingCalendar, setSavingCalendar] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetchStatus()
    // Handle OAuth redirect result
    const params = new URLSearchParams(window.location.search)
    const calendarParam = params.get("calendar")
    if (calendarParam === "conectado") {
      toast.success("Google Calendar conectado")
      window.history.replaceState({}, "", window.location.pathname)
    } else if (calendarParam === "error") {
      toast.error("Error al conectar Google Calendar")
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch("/api/auth/google-calendar/status")
      if (res.ok) {
        const data: CalendarStatus = await res.json()
        setStatus(data)
        if (data.calendarId) setSelectedCalendarId(data.calendarId)
        if (data.connected) fetchCalendars()
      }
    } catch {
      // ignore
    }
  }

  async function fetchCalendars() {
    setLoadingCalendars(true)
    try {
      const res = await fetch("/api/auth/google-calendar/calendars")
      if (res.ok) setCalendars(await res.json())
    } catch {
      // ignore
    } finally {
      setLoadingCalendars(false)
    }
  }

  function handleConnect() {
    const path = returnTo ?? window.location.pathname
    window.location.href = `/api/auth/google-calendar/connect?returnTo=${encodeURIComponent(path)}`
  }

  async function handleCalendarChange(calendarId: string) {
    const selected = calendars.find((c) => c.id === calendarId)
    if (!selected) return

    setSelectedCalendarId(calendarId)
    setSavingCalendar(true)
    try {
      const res = await fetch("/api/auth/google-calendar/calendars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendar_id: calendarId, calendar_name: selected.name }),
      })
      if (res.ok) {
        setStatus((prev) => prev ? { ...prev, calendarName: selected.name, calendarId } : prev)
        toast.success("Calendario actualizado")
      } else {
        toast.error("Error al actualizar calendario")
      }
    } catch {
      toast.error("Error de red")
    } finally {
      setSavingCalendar(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/auth/google-calendar/disconnect", { method: "DELETE" })
      if (res.ok) {
        setStatus({ connected: false, calendarId: null, calendarName: null, email: null })
        setCalendars([])
        setSelectedCalendarId("")
        toast.success("Google Calendar desconectado")
      } else {
        toast.error("Error al desconectar")
      }
    } catch {
      toast.error("Error de red")
    } finally {
      setDisconnecting(false)
      setShowDisconnectDialog(false)
    }
  }

  if (!status) {
    return (
      <div className="border rounded-lg p-4 bg-slate-50 animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-2/3" />
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              status.connected ? "bg-green-100" : "bg-slate-100"
            }`}
          >
            {status.connected ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <CalendarDays className="w-5 h-5 text-slate-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900">Google Calendar</p>

            {status.connected ? (
              <div className="mt-1 space-y-3">
                {status.email && (
                  <p className="text-sm text-slate-500">Conectado como {status.email}</p>
                )}

                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500">Calendario activo</p>
                  {loadingCalendars ? (
                    <p className="text-sm text-slate-400">Cargando calendarios...</p>
                  ) : (
                    <Select
                      value={selectedCalendarId || "primary"}
                      onValueChange={handleCalendarChange}
                      disabled={savingCalendar || calendars.length === 0}
                    >
                      <SelectTrigger className="w-72">
                        <SelectValue
                          placeholder={status.calendarName ?? "Mi calendario (principal)"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {calendars.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.primary ? " (principal)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnectDialog(true)}
                  className="text-slate-600"
                >
                  <Unlink className="w-3.5 h-3.5 mr-1.5" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <div className="mt-1">
                <p className="text-sm text-slate-500">
                  Sincroniza tus tareas con Google Calendar
                </p>
                <Button onClick={handleConnect} size="sm" className="mt-3">
                  Conectar Google Calendar
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Desconectar Google Calendar?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Las tareas futuras no se sincronizarán. Los eventos ya creados permanecen en tu
            calendar.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={disconnecting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? "Desconectando..." : "Desconectar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
