import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Empresas con este status tienen el acceso al dashboard bloqueado.
 * No existe un valor "suspended" separado en `companies.status`
 * (CHECK constraint: 'active' | 'inactive' | 'trial') — "inactive" es
 * el estado que representa una cuenta suspendida.
 */
export const SUSPENDED_COMPANY_STATUS = "inactive"

export const SUSPENDED_COMPANY_MESSAGE =
  "Tu servicio se encuentra suspendido, por lo que no puedes ingresar a esta cuenta. Esta cuenta se eliminará en 30 días si no se vuelve a contratar el servicio."

/**
 * Verifica si una empresa está suspendida (status = 'inactive').
 * Defensa en profundidad para rutas /api/dashboard/* — el bloqueo
 * principal ocurre en proxy.ts, pero cada ruta lo re-verifica por si
 * en el futuro se agrega una ruta nueva sin pasar por el guard central.
 */
export async function isCompanySuspended(
  supabase: SupabaseClient,
  companyId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("companies")
    .select("status")
    .eq("id", companyId)
    .single()

  return data?.status === SUSPENDED_COMPANY_STATUS
}
