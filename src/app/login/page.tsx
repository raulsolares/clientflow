'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Briefcase, Loader2 } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setError(data.error)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
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
            Inicia sesión en tu cuenta
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card glass className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Iniciar sesión</CardTitle>
              <CardDescription>
                Ingresa tus credenciales para acceder al dashboard
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
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Contraseña
                  </label>
                  <Link
                    href="#"
                    className="text-xs text-gold-light transition-colors hover:text-gold hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full lime-glow" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? 'Entrando...' : 'Iniciar sesión'}
              </Button>
              <p className="text-xs text-muted-foreground">
                ¿No tienes cuenta?{' '}
                <Link
                  href="/register"
                  className="text-gold-light transition-colors hover:text-gold hover:underline font-medium"
                >
                  Crear cuenta
                </Link>
              </p>
            </CardFooter>
          </Card>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Al continuar, aceptas nuestros{' '}
          <Link href="#" className="underline hover:text-foreground transition-colors">
            Términos de servicio
          </Link>{' '}
          y{' '}
          <Link href="#" className="underline hover:text-foreground transition-colors">
            Política de privacidad
          </Link>
        </p>
      </div>
    </div>
  )
}
