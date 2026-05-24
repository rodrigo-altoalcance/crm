"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

type Status = "loading" | "ready" | "expired" | "success"

export default function ActivarCuentaPage() {
  const [status, setStatus] = useState<Status>("loading")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function handleAuthCallback() {
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)

      const errorCode = params.get("error")
      if (errorCode) {
        setStatus("expired")
        return
      }

      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          setStatus("expired")
          return
        }
        window.history.replaceState(null, "", window.location.pathname)
        setStatus("ready")
        return
      }

      // No hash params — check if there's already a valid session (e.g., user reloaded the page)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setStatus("ready")
      } else {
        setStatus("expired")
      }
    }

    handleAuthCallback()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      return
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error("No se pudo activar la cuenta: " + error.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setStatus("success")
    toast.success("¡Cuenta activada! Ya podés iniciar sesión.")
    router.push("/login")
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Alto Alcance CRM</h1>
        <p className="mt-1 text-sm text-slate-500">
          {status === "loading" && "Verificando tu enlace..."}
          {status === "ready" && "Creá tu contraseña para activar tu cuenta"}
          {status === "expired" && "Este enlace ya no es válido"}
          {status === "success" && "¡Cuenta activada con éxito!"}
        </p>
      </div>

      {status === "loading" && (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-8 text-center text-slate-500 text-sm">
            Verificando enlace...
          </CardContent>
        </Card>
      )}

      {status === "expired" && (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-8 text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-2">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
            </div>
            <p className="text-slate-800 font-medium">Este link expiró</p>
            <p className="text-slate-500 text-sm">
              El enlace de activación ya fue usado o expiró. Contactá a tu administrador para recibir uno nuevo.
            </p>
          </CardContent>
        </Card>
      )}

      {status === "ready" && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Activar mi cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repetí tu contraseña"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Activando..." : "Activar mi cuenta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
