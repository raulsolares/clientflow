'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchableSelect, type SelectOption } from '@/components/ui/searchable-select'

interface Client {
  id: string
  company_name: string
}

const colors = [
  { value: '#c9a961', label: 'Dorado' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Ámbar' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Cian' },
]

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    color: '#c9a961',
    client_id: '',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Load project data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()

      if (projectError || !projectData) {
        router.push('/dashboard/projects')
        return
      }

      setForm({
        name: projectData.name || '',
        description: projectData.description || '',
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium',
        color: projectData.color || '#c9a961',
        client_id: projectData.client_id || '',
        start_date: projectData.start_date || '',
        end_date: projectData.end_date || '',
      })

      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, company_name')
        .order('company_name')

      if (clientsData) setClients(clientsData)
      setLoadingData(false)
    }
    load()
  }, [params.id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!form.name.trim()) {
      setError('El nombre del proyecto es obligatorio')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        color: form.color,
        client_id: form.client_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      })
      .eq('id', params.id)

    if (updateError) {
      setError('Error al guardar: ' + updateError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/projects/${params.id}`)
    router.refresh()
  }

  if (loadingData) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/dashboard/projects/${params.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al proyecto
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Editar proyecto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Actualiza la información del proyecto
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card glass className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Información del proyecto</CardTitle>
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

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nombre <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ej: Rediseño web Corporativo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Descripción
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 placeholder:text-muted-foreground hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                placeholder="Describe brevemente el proyecto..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Status & Priority row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Estado</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="planning">Planificación</option>
                  <option value="active">Activo</option>
                  <option value="on_hold">En pausa</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Prioridad</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cliente</label>
              <SearchableSelect
                options={clients.map(c => ({ value: c.id, label: c.name }))}
                value={form.client_id}
                onChange={(val) => setForm({ ...form, client_id: val })}
                placeholder="Sin cliente asignado"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Fecha de inicio</label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Fecha de entrega</label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={`h-8 w-8 rounded-lg border-2 transition-all ${
                      form.color === c.value
                        ? 'border-foreground scale-110 shadow-sm'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Link href={`/dashboard/projects/${params.id}`}>
            <Button type="button" variant="ghost">Cancelar</Button>
          </Link>
          <Button type="submit" className="lime-glow min-w-[140px]" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
