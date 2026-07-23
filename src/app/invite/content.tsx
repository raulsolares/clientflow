'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Mail,
  Shield,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  LogIn,
  UserPlus,
  ArrowRight,
  Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast, ToastContainer } from '@/components/ui/toast'

interface InviteInfo {
  id: string
  email: string
  role: string
  company_name: string
  company_id: string
  status: string
  expires_at: string
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Miembro',
  viewer: 'Espectador',
  client: 'Cliente',
}

export default function InviteAcceptContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast, toasts } = useToast()
  const token = searchParams.get('token')

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [accepted, setAccepted] = useState(false)
  const [migrationNeeded, setMigrationNeeded] = useState(false)

  useEffect(() => {
    async function load() {
      if (!token) {
        setError('Token de invitación no proporcionado')
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      try {
        const res = await fetch(`/api/invite/info?token=${token}`)
        const data = await res.json()

        if (!res.ok) {
          if (data.migration_needed) setMigrationNeeded(true)
          setError(data.error || 'No se pudo cargar la invitación')
          setLoading(false)
          return
        }

        setInviteInfo(data)
      } catch {
        setError('Error de conexión')
      }
      setLoading(false)
    }
    load()
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)

    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (data.success) {
        setAccepted(true)
        toast({
          title: '¡Invitación aceptada!',
          description: `Te has unido a ${inviteInfo?.company_name} como ${inviteInfo ? roleLabels[inviteInfo.role] || inviteInfo.role : ''}`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo aceptar la invitación',
          variant: 'error',
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'error' })
    }
    setAccepting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-lime" />
          <p className="text-sm text-muted-foreground">Cargando invitación...</p>
        </div>
      </div>
    )
  }

  if (migrationNeeded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-xl border border-amber-500/30 bg-card/30 p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-amber-400" />
          <h1 className="text-xl font-bold text-foreground">Migración pendiente</h1>
          <p className="text-sm text-muted-foreground">
            El sistema de invitaciones aún no está configurado. Contacta al administrador para que ejecute la migración necesaria.
          </p>
          <Link href="/login">
            <Button variant="outline">Ir al inicio</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-xl border border-border/50 bg-card/30 p-8 text-center space-y-4">
          <XCircle className="h-12 w-12 mx-auto text-red-400" />
          <h1 className="text-xl font-bold text-foreground">Invitación inválida</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link href="/login">
            <Button variant="outline">Ir al inicio</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <ToastContainer toasts={toasts} />
        <div className="max-w-md w-full rounded-xl border border-emerald-500/30 bg-card/30 p-8 text-center space-y-5">
          <CheckCircle className="h-16 w-16 mx-auto text-emerald-400" />
          <h1 className="text-2xl font-bold text-foreground">¡Invitación aceptada!</h1>
          <p className="text-sm text-muted-foreground">
            Ahora formas parte de <strong className="text-foreground">{inviteInfo?.company_name}</strong>
            {inviteInfo && ` como ${roleLabels[inviteInfo.role] || inviteInfo.role}`}.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            Ir al dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <ToastContainer toasts={toasts} />

      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-lime to-cyan shadow-lg shadow-lime/20">
              <Briefcase className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Client<span className="text-lime-light">Flow</span>
          </h1>
        </div>

        {inviteInfo && (
          <div className="rounded-xl border border-border/50 bg-card/30 p-6 space-y-5">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-lime/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-lime-light" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">Has sido invitado</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Te han invitado a unirte a un equipo en ClientFlow
              </p>
            </div>

            <div className="space-y-3 rounded-lg bg-background/50 p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  <p className="text-sm font-medium text-foreground">{inviteInfo.company_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">{inviteInfo.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Rol</p>
                  <p className="text-sm font-medium text-foreground">{roleLabels[inviteInfo.role] || inviteInfo.role}</p>
                </div>
              </div>
            </div>

            {user ? (
              <Button onClick={handleAccept} disabled={accepting} className="w-full">
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {accepting ? 'Aceptando...' : 'Aceptar invitación'}
              </Button>
            ) : (
              <div className="space-y-3">
                <Link href={`/register?redirect=/invite?token=${token}`}>
                  <Button className="w-full">
                    <UserPlus className="h-4 w-4" />
                    Crear cuenta y aceptar
                  </Button>
                </Link>
                <Link href={`/login?redirect=/invite?token=${token}`}>
                  <Button variant="outline" className="w-full">
                    <LogIn className="h-4 w-4" />
                    Iniciar sesión
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Esta invitación expira en 7 días a partir de su creación.
        </p>
      </div>
    </div>
  )
}
