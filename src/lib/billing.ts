export type BillingStatus = "yellow" | "red" | null

export interface BillingStatusResult {
  status: BillingStatus
  fecha_vencimiento: string | null
}

/** Returns today's date string (YYYY-MM-DD) in America/Santiago timezone. */
function todaySantiago(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date())
}

/**
 * Computes billing alert status from a next_payment_date (YYYY-MM-DD string or null).
 * Both dates are treated as plain calendar dates (no time component).
 */
export function computeBillingStatus(nextPaymentDate: string | null): BillingStatusResult {
  if (!nextPaymentDate) return { status: null, fecha_vencimiento: null }

  const today = todaySantiago()
  const todayMs = Date.parse(today)
  const dueMs = Date.parse(nextPaymentDate)
  const daysLeft = Math.round((dueMs - todayMs) / 86_400_000)

  if (daysLeft === 1) return { status: "yellow", fecha_vencimiento: nextPaymentDate }
  if (daysLeft <= 0) return { status: "red", fecha_vencimiento: nextPaymentDate }
  return { status: null, fecha_vencimiento: null }
}
