'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'active',
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!form.name.trim()) {
      setError('El nombre de la empresa es obligatorio')
      setLoading(false)
      return
    }

    if (!form.company.trim()) {
      setError('El nombre del contacto es obligatorio')
      setLoading(false)
      return
    }

    if (!form.email.trim()) {
      setError('El correo electrónico es obligatorio')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { error: insertError } = await supabase.from('clients').insert({
      company_id: profile?.company_id,
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    })

    if (insertError) {
      setError('Error al crear el cliente: ' + insertError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/clients')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a clientes
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nuevo cliente</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registra un nuevo cliente para tu agencia
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card glass className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Información del cliente</CardTitle>
            <CardDescription>
              Los campos marcados con * son obligatorios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Company Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nombre de la empresa <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ej: Tech Solutions S.A."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            {/* Contact Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nombre del contacto <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ej: Juan Pérez"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Correo electrónico <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="Ej: juan@techsolutions.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Teléfono
              </label>
              <Input
                type="tel"
                placeholder="Ej: +52 55 1234 5678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Estado</label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Notas
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 placeholder:text-muted-foreground hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                placeholder="Notas o comentarios sobre el cliente..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Link href="/dashboard/clients">
            <Button type="button" variant="ghost">Cancelar</Button>
          </Link>
          <Button type="submit" className="lime-glow min-w-[140px]" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Creando...' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
