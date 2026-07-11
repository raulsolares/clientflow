'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react"
import { createClient } from '@/lib/supabase'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // The recovery flow sets a session via URL hash params.
    // Wait for Supabase to process the session from the URL.
    const supabase = createClient()

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
        setInitializing(false)
      }
    })

    // Also check if already has session after a short delay
    // for cases where the hash was already processed
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setSessionReady(true)
      }
      setInitializing(false)
    }

    // Small delay to let Supabase process hash params
    const timer = setTimeout(checkSession, 1500)

    return () => {
      clearTimeout(timer)
      supabase.auth.onAuthStateChange(() => {})
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError('Error al actualizar la contraseña: ' + updateError.message)
    } else {
      setSuccess(true)
    }
  }

  if (initializing) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Verificando sesión...</span>
        </div>
      </div>
    )
  }

  if (!sessionReady && !success) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-background to-background pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-gold/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm">
          <Card glass className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Enlace inválido o expirado</CardTitle>
              <CardDescription>
                El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Link href="/forgot-password">
                <Button variant="outline">
                  Solicitar nuevo enlace
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-background to-background pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-gold/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-6 text-center">
            <img
              src="/logo-clientflow.png"
              alt="ClientFlow by DISTRITOW"
              className="mx-auto h-10 w-auto object-contain"
            />
          </div>

          <Card glass className="w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
              </div>
              <CardTitle className="text-lg">Contraseña actualizada</CardTitle>
              <CardDescription>
                Tu contraseña se ha restablecido correctamente.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Link href="/login">
                <Button className="lime-glow">
                  <KeyRound className="h-4 w-4 mr-1" />
                  Iniciar sesión
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-background to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-gold/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 text-center">
          <img
            src="/logo-clientflow.png"
            alt="ClientFlow by DISTRITOW"
            className="mx-auto h-10 w-auto object-contain"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Restablece tu contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card glass className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Nueva contraseña</CardTitle>
              <CardDescription>
                Ingresa tu nueva contraseña para acceder a tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Nueva contraseña
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                  Confirmar contraseña
                </label>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full lime-glow" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? 'Actualizando...' : 'Restablecer contraseña'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}
