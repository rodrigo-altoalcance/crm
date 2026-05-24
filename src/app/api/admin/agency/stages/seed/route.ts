import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

const DEFAULT_STAGES = [
  { name: "Nuevo",             color: "#6366F1", position: 0, is_final: false, is_lost: false },
  { name: "Llamada agendada",  color: "#F59E0B", position: 1, is_final: false, is_lost: false },
  { name: "Reunión",           color: "#3B82F6", position: 2, is_final: false, is_lost: false },
  { name: "Negociación",       color: "#8B5CF6", position: 3, is_final: false, is_lost: false },
  { name: "Cerrado",           color: "#10B981", position: 4, is_final: true,  is_lost: false },
  { name: "No calificó",       color: "#EF4444", position: 5, is_final: false, is_lost: true  },
]

export async function POST() {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { count } = await admin
    .from("agency_stages")
    .select("*", { count: "exact", head: true })

  if (count && count > 0) {
    return NextResponse.json({ error: "Ya hay etapas configuradas" }, { status: 409 })
  }

  const { error } = await admin.from("agency_stages").insert(DEFAULT_STAGES)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
