'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft,
  Save,
  Trash2,
  Building2,
  User,
  Mail,
  Phone,
  FileText,
  FolderKanban,
  Calendar,
  Loader2,
  Pencil,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Client {
  id: string
  company_id: string
  profile_id: string | null
  company_name: string
  contact_name: string
  email: string
  phone: string | null
  logo_url: string | null
  status: string
  notes: string | null
  created_at: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [projectsCount, setProjectsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)

  // Form state for inline editing
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    status: 'active',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Load client
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!clientData) { router.push('/dashboard/clients'); return }
      setClient(clientData)
      setForm({
        company_name: clientData.company_name || '',
        contact_name: clientData.contact_name || '',
        email: clientData.email || '',
        phone: clientData.phone || '',
        status: clientData.status || 'active',
        notes: clientData.notes || '',
      })

      // Load projects count
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', params.id)

      setProjectsCount(count ?? 0)
      setLoading(false)
    }
    load()
  }, [params.id, router])

  async function handleSave() {
    setError('')
    setSuccess('')
    setSaving(true)

    if (!form.company_name.trim()) {
      setError('El nombre de la empresa es obligatorio')
      setSaving(false)
      return
    }
    if (!form.contact_name.trim()) {
      setError('El nombre del contacto es obligatorio')
      setSaving(false)
      return
    }
    if (!form.email.trim()) {
      setError('El correo electrónico es obligatorio')
      setSaving(false)
      return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      })
      .eq('id', params.id)

    if (updateError) {
      setError('Error al guardar: ' + updateError.message)
      setSaving(false)
      return
    }

    // Update local state
    setClient(prev => prev ? {
      ...prev,
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    } : null)

    setSuccess('Cliente actualizado correctamente')
    setEditing(false)
    setSaving(false)

    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este cliente? También se eliminarán todos sus proyectos asociados.')) return

    setDeleting(true)
    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      setError('Error al eliminar: ' + deleteError.message)
      setDeleting(false)
      return
    }

    router.push('/dashboard/clients')
    router.refresh()
  }

  function cancelEdit() {
    if (client) {
      setForm({
        company_name: client.company_name || '',
        contact_name: client.contact_name || '',
        email: client.email || '',
        phone: client.phone || '',
        status: client.status || 'active',
        notes: client.notes || '',
      })
    }
    setEditing(false)
    setError('')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  )

  if (!client) return null

  const statusBadge = client.status === 'active'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a clientes
      </Link>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gold/10 text-gold-light font-bold text-xl">
            {client.company_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {editing ? (
                  <Input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    className="text-2xl font-bold h-auto py-1 px-2"
                    placeholder="Nombre de la empresa"
                  />
                ) : (
                  client.company_name
                )}
              </h1>
              <Badge className={`border ${statusBadge} text-xs`}>
                {client.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            {!editing && (
              <p className="text-sm text-muted-foreground mt-1">
                Creado el {new Date(client.created_at).toLocaleDateString('es-MX')}
              </p>
            )}
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button size="sm" className="lime-glow" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-muted-foreground hover:text-red-400">
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Contact Info Card */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-gold-light" />
            Información de contacto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Nombre del contacto
              </label>
              {editing ? (
                <Input
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="Nombre del contacto"
                />
              ) : (
                <p className="text-sm text-foreground flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {client.contact_name}
                </p>
              )}
            </div>

            {/* Status (only show in view mode) */}
            {!editing && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Estado
                </label>
                <p className="text-sm text-foreground">
                  <Badge className={`border ${statusBadge}`}>
                    {client.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Correo electrónico
              </label>
              {editing ? (
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              ) : (
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {client.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Teléfono
              </label>
              {editing ? (
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+52 55 1234 5678"
                />
              ) : (
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {client.phone || (
                    <span className="text-muted-foreground italic">No registrado</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Edit mode: Status selector */}
          {editing && (
            <div className="mt-6 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Estado
              </label>
              <select
                className="flex h-10 w-full max-w-xs rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Card */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-gold-light" />
            Notas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <textarea
              className="flex min-h-[120px] w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 placeholder:text-muted-foreground hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              placeholder="Notas o comentarios sobre el cliente..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          ) : (
            <div className="text-sm text-foreground">
              {client.notes ? (
                <p className="whitespace-pre-wrap">{client.notes}</p>
              ) : (
                <p className="text-muted-foreground italic">Sin notas registradas</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects Card */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-gold-light" />
              Proyectos
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {projectsCount} proyecto{projectsCount !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10">
                <span className="text-xl font-bold text-gold-light">{projectsCount}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Total de proyectos
                </p>
                <p className="text-xs text-muted-foreground">
                  {projectsCount === 0
                    ? 'Este cliente aún no tiene proyectos'
                    : `Cliente con ${projectsCount} proyecto${projectsCount !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Link href={`/dashboard/projects?client_id=${client.id}`}>
              <Button variant="outline" size="sm">
                <FolderKanban className="h-4 w-4 mr-1" />
                Ver proyectos
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pb-4">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Cliente desde {new Date(client.created_at).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>
    </div>
  )
}
