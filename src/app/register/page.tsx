'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Briefcase, Loader2 } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        password,
        name: formData.get('name'),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setError(data.error)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-background to-background pointer-events-none" />
        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-dark shadow-lg shadow-gold/10">
            <Briefcase className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">¡Cuenta creada!</h1>
          <p className="text-muted-foreground mb-6">
            Revisa tu correo para confirmar el registro. Luego puedes iniciar sesión.
          </p>
          <Button onClick={() => router.push('/login')} className="lime-glow">
            Ir a iniciar sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-background to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-gold/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-dark shadow-lg shadow-gold/10">
            <Briefcase className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Client<span className="text-gold-light">Flow</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea tu cuenta de agencia
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card glass className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Crear cuenta</CardTitle>
              <CardDescription>
                Registra tu agencia en ClientFlow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Nombre completo
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Tu nombre"
                  autoComplete="name"
                />
              </div>
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
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Contraseña
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm" className="text-sm font-medium text-foreground">
                  Confirmar contraseña
                </label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full lime-glow" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? 'Creando...' : 'Crear cuenta'}
              </Button>
              <p className="text-xs text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <Link
                  href="/login"
                  className="text-gold-light transition-colors hover:text-gold hover:underline font-medium"
                >
                  Iniciar sesión
                </Link>
              </p>
            </CardFooter>
          </Card>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Al registrarte, aceptas nuestros{' '}
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
