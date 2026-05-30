import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getProfile } from "@/lib/auth/getProfile"

export async function POST(request: Request) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 })

  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]
  const ALLOWED_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "svg"]
  const ext = (file.name.split(".").pop() || "").toLowerCase()
  if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido. Use PNG, JPG, WEBP, GIF o SVG." }, { status: 400 })
  }
  const path = `logo/agency-logo-${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from("agency-assets")
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage
    .from("agency-assets")
    .getPublicUrl(path)

  await admin.from("admin_audit_log").insert({
    user_id: profile.id,
    user_name: profile.full_name,
    action: "Logo de la agencia actualizado",
    section: "organization",
    details: { path },
  })

  return NextResponse.json({ url: publicUrl })
}
