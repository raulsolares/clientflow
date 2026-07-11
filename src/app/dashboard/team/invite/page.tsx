'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  UserPlus,
  ArrowLeft,
  Mail,
  Shield,
  Copy,
  Check,
  Link as LinkIcon,
  AlertTriangle,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast, ToastContainer } from '@/components/ui/toast'
import Link from 'next/link'

const roles = [
  { value: 'admin', label: 'Admin', desc: 'Acceso completo a todo el sistema', color: 'text-gold-light' },
  { value: 'manager', label: 'Manager', desc: 'Puede gestionar proyectos y equipo', color: 'text-blue-400' },
  { value: 'member', label: 'Miembro', desc: 'Puede trabajar en proyectos asignados', color: 'text-emerald-400' },
  { value: 'viewer', label: 'Espectador', desc: 'Solo lectura en proyectos', color: 'text-gray-400' },
  { value: 'client', label: 'Cliente', desc: 'Acceso limitado al portal del cliente', color: 'text-violet-400' },
]

export default function InvitePage() {
  const router = useRouter()
  const { toast, toasts } = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    token: string
    link: string
    email: string
    emailSent?: boolean
    emailError?: string | null
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Ingresa un email válido', variant: 'error' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const data = await res.json()

      if (data.success) {
        setResult(data)
        toast({
          title: 'Invitación creada',
          description: data.emailSent
            ? `Invitación enviada a ${data.email}`
            : `Invitación generada (el email no pudo enviarse: ${data.emailError || 'error desconocido'})`,
          variant: data.emailSent ? 'success' : 'warning',
        })
      } else {
        toast({
          title: 'Error',
          description: data.detail || data.error || 'No se pudo crear la invitación',
          variant: 'error',
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'error' })
    }
    setLoading(false)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({ title: 'Copiado', description: 'Enlace copiado al portapapeles', variant: 'success' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Error', description: 'No se pudo copiar', variant: 'error' })
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/team"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invitar miembro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envía una invitación para unirse a tu organización
          </p>
        </div>
      </div>

      {!result ? (
        <>
          {/* Form */}
          <form onSubmit={handleSubmit} className="rounded-xl border border-border/50 bg-card/30 p-6 space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Correo electrónico
              </label>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Rol
              </label>
              <Select value={role} onValueChange={setRole} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex flex-col">
                        <span className={r.color}>{r.label}</span>
                        <span className="text-[10px] text-muted-foreground">{r.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role details */}
            <div className="rounded-lg border border-border/30 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Rol seleccionado: </strong>
                {roles.find((r) => r.value === role)?.desc}
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? 'Creando invitación...' : 'Enviar invitación'}
            </Button>
          </form>

          {/* Info */}
          <div className="rounded-xl border border-border/50 bg-card/20 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">¿Cómo funciona?</p>
              <p>La invitación genera un enlace único que expira en 7 días. Comparte el enlace con la persona que deseas invitar. Al aceptarlo, se unirá automáticamente a tu organización con el rol seleccionado.</p>
            </div>
          </div>
        </>
      ) : (
        /* Success Result */
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Invitación creada</h2>
            <p className="text-sm text-muted-foreground">
              Se generó una invitación para <strong className="text-foreground">{result.email}</strong>
            </p>
            {result.emailSent ? (
              <p className="text-xs text-emerald-400 mt-2 flex items-center justify-center gap-1">
                <Send className="h-3 w-3" />
                Email de invitación enviado
              </p>
            ) : (
              <p className="text-xs text-amber-400 mt-2 flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {result.emailError || 'No se pudo enviar el email. Comparte el enlace manualmente.'}
              </p>
            )}
          </div>

          {/* Invitation Link */}
          <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <LinkIcon className="h-3 w-3" />
              Enlace de invitación
            </label>
            <div className="flex gap-2">
              <Input
                value={result.link}
                readOnly
                className="text-xs font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(result.link)}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setResult(null)
                setEmail('')
                setRole('member')
              }}
            >
              <UserPlus className="h-4 w-4" />
              Invitar otro
            </Button>
            <Button className="flex-1" onClick={() => router.push('/dashboard/team')}>
              Ver equipo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
