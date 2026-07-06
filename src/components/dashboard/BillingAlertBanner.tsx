"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, AlertCircle, X } from "lucide-react"
import type { BillingStatus } from "@/lib/billing"

interface BillingAlertBannerProps {
  status: BillingStatus
  fechaVencimiento: string | null
  userId: string
}

function todaySantiago(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date())
}

function formatFecha(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getDaysLeft(fechaVencimiento: string): number {
  const today = todaySantiago()
  return Math.round((Date.parse(fechaVencimiento) - Date.parse(today)) / 86_400_000)
}

function buildMessage(status: BillingStatus, fechaVencimiento: string | null): string {
  if (!status || !fechaVencimiento) return ""
  const days = getDaysLeft(fechaVencimiento)
  const fecha = formatFecha(fechaVencimiento)
  if (days === 1) return `Tu pago vence mañana, ${fecha}`
  if (days === 0) return "Tu pago vence hoy"
  return `Tu pago está vencido desde el ${fecha}`
}

export function BillingAlertBanner({ status, fechaVencimiento, userId }: BillingAlertBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!status) return
    try {
      const stored = localStorage.getItem(`billing_alert_${userId}`)
      if (stored) {
        const { date, status: storedStatus } = JSON.parse(stored)
        const today = todaySantiago()
        if (date === today && storedStatus === status) {
          return // already dismissed today with the same status
        }
      }
    } catch {
      // ignore malformed localStorage entries
    }
    setVisible(true)
  }, [status, userId])

  function handleDismiss() {
    try {
      localStorage.setItem(
        `billing_alert_${userId}`,
        JSON.stringify({ date: todaySantiago(), status })
      )
    } catch {
      // ignore storage errors
    }
    setVisible(false)
  }

  if (!visible || !status) return null

  const isYellow = status === "yellow"
  const message = buildMessage(status, fechaVencimiento)

  return (
    <div
      className={[
        "border-b px-4 py-2.5 flex items-center justify-between flex-shrink-0",
        isYellow
          ? "bg-amber-50 border-amber-200"
          : "bg-red-50 border-red-200",
      ].join(" ")}
    >
      <div className={["flex items-center gap-2 text-sm font-medium", isYellow ? "text-amber-800" : "text-red-800"].join(" ")}>
        {isYellow ? (
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
        )}
        <span>{message}</span>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Cerrar aviso"
        className={[
          "ml-4 rounded p-0.5 transition-colors",
          isYellow ? "text-amber-600 hover:bg-amber-100" : "text-red-600 hover:bg-red-100",
        ].join(" ")}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
