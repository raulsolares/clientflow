'use client'

import { useEffect, useState, useRef } from 'react'
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
  Upload,
  Download,
  File,
  Image,
  FileSpreadsheet,
  FileArchive,
  FileAudio,
  FileVideo,
  Shield,
  Send,
  AlertTriangle,
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
  portal_expires_at: string | null
  is_active: boolean | null
  portal_password: string | null
}

interface ClientFile {
  id: string
  client_id: string | null
  project_id: string | null
  company_id: string
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string
  uploaded_by: string | null
  created_at: string
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return Image
  if (mime.startsWith('video/')) return FileVideo
  if (mime.startsWith('audio/')) return FileAudio
  if (mime.includes('pdf')) return FileText
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return FileArchive
  return File
}

function getFileColor(mime: string) {
  if (mime.startsWith('image/')) return 'text-blue-400 bg-blue-500/10'
  if (mime.startsWith('video/')) return 'text-violet-400 bg-violet-500/10'
  if (mime.startsWith('audio/')) return 'text-amber-400 bg-amber-500/10'
  if (mime.includes('pdf')) return 'text-red-400 bg-red-500/10'
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return 'text-emerald-400 bg-emerald-500/10'
  if (mime.includes('zip') || mime.includes('rar')) return 'text-cyan-400 bg-cyan-500/10'
  return 'text-gold-light bg-gold/10'
}

function formatSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
    portal_expires_at: '',
    portal_expires_time: '',
    is_active: true,
  })

  // Files state
  const [clientFiles, setClientFiles] = useState<ClientFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        portal_expires_at: clientData.portal_expires_at
          ? clientData.portal_expires_at.substring(0, 10)
          : '',
        portal_expires_time: clientData.portal_expires_at
          ? (() => {
              const d = new Date(clientData.portal_expires_at)
              return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
            })()
          : '',
        is_active: clientData.is_active ?? true,
      })

      // Load projects count
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', params.id)

      setProjectsCount(count ?? 0)

      // Load client files
      setLoadingFiles(true)
      const { data: filesData } = await supabase
        .from('project_files')
        .select('*')
        .eq('client_id', params.id)
        .order('created_at', { ascending: false })
      if (filesData) setClientFiles(filesData)
      setLoadingFiles(false)
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
    const portalExpiresAt = form.portal_expires_at
      ? `${form.portal_expires_at}T${form.portal_expires_time || '23:59'}:00`
      : null

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
        portal_expires_at: portalExpiresAt,
        is_active: form.is_active,
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
      portal_expires_at: portalExpiresAt,
      is_active: form.is_active,
    } : null)

    setSuccess('Cliente actualizado correctamente')
    setEditing(false)
    setSaving(false)

    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este cliente? También se eliminarán todos sus proyectos asociados.')) return

    setDeleting(true)
    setError('')

    try {
      const res = await fetch('/api/clients/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: params.id,
          userId: client?.profile_id || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar cliente')
      }

      router.push('/dashboard/clients')
      router.refresh()
    } catch (err: any) {
      setError('Error al eliminar: ' + (err.message || 'desconocido'))
      setDeleting(false)
    }
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
        portal_expires_at: client.portal_expires_at
          ? client.portal_expires_at.substring(0, 10) : '',
        portal_expires_time: client.portal_expires_at
          ? (() => { const d = new Date(client.portal_expires_at!); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` })()
          : '',
        is_active: client.is_active ?? true,
      })
    }
    setEditing(false)
    setError('')
  }

  async function handleClientFileUpload(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      setError('El archivo excede el límite de 50MB')
      return
    }

    setUploadingFile(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('client_id', params.id as string)

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        setClientFiles(prev => [data.file, ...prev])
        setSuccess('Archivo subido correctamente')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.detail || data.error || 'Error al subir archivo')
      }
    } catch {
      setError('Error de conexión al subir archivo')
    }
    setUploadingFile(false)
  }

  async function handleClientFileDelete(file: ClientFile) {
    if (!confirm(`¿Eliminar "${file.file_name}" permanentemente?`)) return

    try {
      const res = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id }),
      })
      const data = await res.json()

      if (data.success) {
        setClientFiles(prev => prev.filter(f => f.id !== file.id))
        setSuccess('Archivo eliminado')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'No se pudo eliminar el archivo')
      }
    } catch {
      setError('Error de conexión al eliminar archivo')
    }
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

      {/* Portal Access Card */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold-light" />
            Acceso al Portal
            {!editing && (
              <span className={`ml-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                client.is_active === false
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : client.portal_expires_at && new Date(client.portal_expires_at) < new Date()
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  client.is_active === false ? 'bg-red-400'
                    : client.portal_expires_at && new Date(client.portal_expires_at) < new Date() ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`} />
                {client.is_active === false ? 'Desactivado'
                  : client.portal_expires_at && new Date(client.portal_expires_at) < new Date() ? 'Expirado'
                  : 'Activo'}
              </span>
            )}
          </CardTitle>
          <CardDescription>Controla el acceso del cliente al portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border/30 bg-accent/10 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Acceso al portal</p>
                  <p className="text-xs text-muted-foreground">Permite que el cliente acceda al portal</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    form.is_active ? 'bg-emerald-500' : 'bg-muted'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    form.is_active ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Expira el</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={form.portal_expires_at}
                    onChange={(e) => setForm(f => ({ ...f, portal_expires_at: e.target.value }))}
                  />
                  <Input
                    type="time"
                    value={form.portal_expires_time}
                    onChange={(e) => setForm(f => ({ ...f, portal_expires_time: e.target.value }))}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Deja vacío para que no expire. La hora por defecto es 23:59.
                </p>
              </div>

              {/* Invite button */}
              {client.email && (
                <div className="rounded-lg border border-border/30 bg-accent/10 p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Enviar invitación de acceso al portal a <strong className="text-foreground">{form.email || client.email}</strong>
                  </p>
                  <Button size="sm" variant="outline" className="w-full" onClick={async () => {
                    if (!confirm(`¿Enviar invitación del portal a ${form.email || client.email}?`)) return
                    try {
                      const res = await fetch('/api/auth/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: form.email || client.email,
                          password: Math.random().toString(36).slice(-12),
                          name: form.contact_name || client.contact_name,
                        }),
                      })
                      const data = await res.json()
                      if (data.success) alert('Invitación enviada. El cliente recibirá un email para crear su contraseña.')
                      else alert('Error: ' + (data.error || 'desconocido'))
                    } catch { alert('Error de conexión') }
                  }}>
                    <Send className="h-4 w-4 mr-1" />
                    Enviar invitación
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/30 bg-accent/10 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Estado</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {client.is_active === false ? 'Desactivado' : 'Activo'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/30 bg-accent/10 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Expira</p>
                  <p className="text-sm font-medium text-foreground">
                    {client.portal_expires_at
                      ? new Date(client.portal_expires_at).toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })
                      : 'Sin expiración'}
                  </p>
                </div>
              </div>
              {client.is_active !== false && client.portal_expires_at && new Date(client.portal_expires_at) < new Date() && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  El acceso del cliente ha expirado. Edita el cliente para renovarlo.
                </div>
              )}
            </>
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

      {/* Archivos section */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gold-light" />
              Archivos ({clientFiles.length})
            </span>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleClientFileUpload(file)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              />
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
              >
                {uploadingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadingFile ? 'Subiendo...' : 'Subir archivo'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingFiles ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-lime border-t-transparent" />
            </div>
          ) : clientFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay archivos vinculados a este cliente. Sube el primero.
            </p>
          ) : (
            <div className="divide-y divide-border/30">
              {clientFiles.map((file) => {
                const Icon = getFileIcon(file.mime_type)
                const iconColor = getFileColor(file.mime_type)
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 py-3 hover:bg-accent/30 transition-colors group"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(file.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </span>
                        <span>{formatSize(file.file_size)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener"
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Descargar"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => handleClientFileDelete(file)}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
