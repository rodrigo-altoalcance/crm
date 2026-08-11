/**
 * Cálculos de fecha en timezone America/Santiago para widgets del dashboard.
 * Todo el cómputo vive server-side (page.tsx / API routes) — los componentes
 * client solo reciben strings ya formateados, garantizando consistencia
 * servidor/cliente sin duplicar lógica de timezone en el browser.
 */

/** Fecha de hoy (YYYY-MM-DD) en America/Santiago. */
function todaySantiago(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date())
}

/** Formatea un año/mes/día (calendario, sin hora) como "DD MMM" en español, p.ej. "05 ago". */
function formatDayMonth(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day)
  const parts = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).formatToParts(date)
  const d = parts.find((p) => p.type === "day")?.value ?? ""
  const mo = parts.find((p) => p.type === "month")?.value ?? ""
  return `${d} ${mo}`
}

export interface WeekRange {
  /** Fecha de inicio de la ventana, YYYY-MM-DD (hoy - 6 días) en Santiago. */
  startDate: string
  /** Fecha de fin de la ventana, YYYY-MM-DD (hoy) en Santiago. */
  endDate: string
  /** Label listo para mostrar, formato "DD MMM – DD MMM". */
  label: string
}

/**
 * Ventana móvil de 7 días: hoy - 6 días hasta hoy inclusive, calculada
 * sobre el calendario de America/Santiago (no semana lunes-domingo).
 */
export function getWeekRangeSantiago(): WeekRange {
  const today = todaySantiago()
  const [y, m, d] = today.split("-").map(Number)

  const startUtc = new Date(Date.UTC(y, m - 1, d))
  startUtc.setUTCDate(startUtc.getUTCDate() - 6)
  const sy = startUtc.getUTCFullYear()
  const sm = startUtc.getUTCMonth() + 1
  const sd = startUtc.getUTCDate()

  const startDate = `${sy}-${String(sm).padStart(2, "0")}-${String(sd).padStart(2, "0")}`

  return {
    startDate,
    endDate: today,
    label: `${formatDayMonth(sy, sm, sd)} – ${formatDayMonth(y, m, d)}`,
  }
}

export interface MonthBucket {
  /** Clave YYYY-MM. */
  key: string
  /** Label corto para el eje del gráfico, p.ej. "ago 2026". */
  label: string
  /** Primer día del mes, YYYY-MM-DD. */
  startDate: string
  /** Primer día del mes siguiente, YYYY-MM-DD (límite exclusivo). */
  nextMonthStart: string
}

/**
 * Genera `months` buckets mensuales contando hacia atrás desde el mes
 * actual incluido (calendario America/Santiago), en orden cronológico
 * ascendente (más antiguo primero).
 */
export function getMonthBucketsSantiago(months: number): MonthBucket[] {
  const today = todaySantiago()
  const [y, m] = today.split("-").map(Number)

  const buckets: MonthBucket[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    const by = d.getUTCFullYear()
    const bm = d.getUTCMonth() + 1
    const key = `${by}-${String(bm).padStart(2, "0")}`

    const next = new Date(Date.UTC(by, bm, 1))
    const ny = next.getUTCFullYear()
    const nm = next.getUTCMonth() + 1

    const parts = new Intl.DateTimeFormat("es-CL", { month: "short", year: "numeric" }).formatToParts(
      new Date(by, bm - 1, 1)
    )
    const monthLabel = parts.find((p) => p.type === "month")?.value ?? ""
    const yearLabel = parts.find((p) => p.type === "year")?.value ?? ""

    buckets.push({
      key,
      label: `${monthLabel} ${yearLabel}`,
      startDate: `${by}-${String(bm).padStart(2, "0")}-01`,
      nextMonthStart: `${ny}-${String(nm).padStart(2, "0")}-01`,
    })
  }
  return buckets
}
