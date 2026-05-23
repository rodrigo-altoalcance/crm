"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X } from "lucide-react"
import Image from "next/image"

interface Props {
  settings: Record<string, string>
}

export function AgencyOrganizationForm({ settings }: Props) {
  const [form, setForm] = useState({
    agency_name: settings.agency_name || "",
    agency_address: settings.agency_address || "",
    agency_phone: settings.agency_phone || "",
    agency_website: settings.agency_website || "",
    agency_logo_url: settings.agency_logo_url || "",
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>(settings.agency_logo_url || "")
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function clearLogo() {
    setLogoFile(null)
    setLogoPreview("")
    setForm((f) => ({ ...f, agency_logo_url: "" }))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let logoUrl = form.agency_logo_url

      if (logoFile) {
        const fd = new FormData()
        fd.append("file", logoFile)
        const res = await fetch("/api/admin/agency/logo", { method: "POST", body: fd })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          toast.error(d.error || "Error al subir el logo")
          setLoading(false)
          return
        }
        const d = await res.json()
        logoUrl = d.url
      }

      const payload = { ...form, agency_logo_url: logoUrl }
      const res = await fetch("/api/admin/agency/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setForm((f) => ({ ...f, agency_logo_url: logoUrl }))
        setLogoFile(null)
        toast.success("Organización guardada")
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || "Error al guardar")
      }
    } catch {
      toast.error("Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo de la agencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoPreview ? (
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                <Image
                  src={logoPreview}
                  alt="Logo"
                  width={96}
                  height={96}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={clearLogo}>
                <X className="w-4 h-4 mr-1" /> Quitar logo
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-500">Haz clic para subir el logo</p>
              <p className="text-xs text-slate-400">PNG, JPG, SVG hasta 2 MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {!logoPreview && (
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> Seleccionar imagen
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información de la agencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="agency_name">Nombre de la agencia</Label>
            <Input
              id="agency_name"
              value={form.agency_name}
              onChange={(e) => set("agency_name", e.target.value)}
              placeholder="Alto Alcance"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agency_address">Dirección</Label>
            <Input
              id="agency_address"
              value={form.agency_address}
              onChange={(e) => set("agency_address", e.target.value)}
              placeholder="Av. Providencia 123, Santiago"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agency_phone">Teléfono</Label>
            <Input
              id="agency_phone"
              value={form.agency_phone}
              onChange={(e) => set("agency_phone", e.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agency_website">Sitio web</Label>
            <Input
              id="agency_website"
              type="url"
              value={form.agency_website}
              onChange={(e) => set("agency_website", e.target.value)}
              placeholder="https://altoalcance.cl"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
