'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, ArrowLeft } from "lucide-react"

export default function RegisterPage() {
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

        <Card glass className="w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
              <Lock className="h-6 w-6 text-gold-light" />
            </div>
            <CardTitle className="text-lg">Registro solo por invitación</CardTitle>
            <CardDescription>
              ClientFlow es una plataforma privada. Las cuentas solo pueden ser creadas por un administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si ya tienes una invitación, revisa tu correo electrónico para el enlace de acceso o contacta al administrador de tu equipo.
            </p>
            <Link href="/login">
              <Button className="w-full lime-glow" size="lg">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a iniciar sesión
              </Button>
            </Link>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ClientFlow by{' '}
          <a href="https://www.distritow.com" target="_blank" rel="noopener" className="underline hover:text-foreground transition-colors">
            DistritoW
          </a>
        </p>
      </div>
    </div>
  )
}
