'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Briefcase, Loader2, ArrowLeft, MailCheck } from "lucide-react"
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    setLoading(false)

    if (resetError) {
      setError('Error al enviar el correo: ' + resetError.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
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
                  <MailCheck className="h-7 w-7 text-emerald-400" />
                </div>
              </div>
              <CardTitle className="text-lg">Revisa tu correo</CardTitle>
              <CardDescription>
                Hemos enviado un enlace de recuperación a <strong className="text-foreground">{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Si el correo está registrado, recibirás las instrucciones para restablecer tu contraseña en unos minutos.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver al inicio de sesión
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
            Recupera tu contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card glass className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">¿Olvidaste tu contraseña?</CardTitle>
              <CardDescription>
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@clientflow.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full lime-glow" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>
              <p className="text-xs text-muted-foreground">
                <Link
                  href="/login"
                  className="text-gold-light transition-colors hover:text-gold hover:underline font-medium"
                >
                  <ArrowLeft className="h-3 w-3 inline mr-1" />
                  Volver al inicio de sesión
                </Link>
              </p>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}
