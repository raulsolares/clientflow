'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Loader2, Plus, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Client {
  id: string
  company_name: string
}

interface Template {
  id: string
  name: string
  tasks_count?: number
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

export default function NewProjectPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templateTasks, setTemplateTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
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

      // Load clients
      const { data: clientsData } = await supabase.from('clients').select('id, company_name').order('company_name')
      if (clientsData) setClients(clientsData)

      // Load templates
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()

        if (profile?.company_id) {
          const { data: tmpls } = await supabase
            .from('project_templates')
            .select('id, name')
            .eq('company_id', profile.company_id)
            .is('deleted_at', null)
            .order('name')
          if (tmpls) {
            const enriched = await Promise.all(tmpls.map(async (t: any) => {
              const { count } = await supabase
                .from('project_template_tasks')
                .select('*', { count: 'exact', head: true })
                .eq('template_id', t.id)
              return { ...t, tasks_count: count || 0 }
            }))
            setTemplates(enriched)
          }

          // Check URL for template param
          const urlParams = new URLSearchParams(window.location.search)
          const tmplId = urlParams.get('template')
          if (tmplId) {
            const found = tmpls?.find((t: any) => t.id === tmplId)
            if (found) {
              setSelectedTemplate({ ...found, tasks_count: 0 })
              selectTemplate(found.id)
            }
          }
        }
      }
    }
    load()
  }, [])

  async function selectTemplate(templateId: string) {
    const supabase = createClient()
    const tmpl = templates.find(t => t.id === templateId)
    setSelectedTemplate(tmpl || null)

    if (tmpl) {
      const { data: tasks } = await supabase
        .from('project_template_tasks')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order')
      setTemplateTasks(tasks || [])
      // Auto-fill name if empty
      if (!form.name && tmpl) {
        setForm(prev => ({ ...prev, name: tmpl.name }))
      }
    } else {
      setTemplateTasks([])
    }
  }

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { error: insertError } = await supabase.from('projects').insert({
      company_id: profile?.company_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      color: form.color,
      client_id: form.client_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      template_id: selectedTemplate?.id || null,
    })

    if (insertError) {
      setError('Error al crear el proyecto: ' + insertError.message)
      setLoading(false)
      return
    }

    // If creating from template, create the tasks
    if (selectedTemplate && templateTasks.length > 0) {
      const newTasks = templateTasks.map((task: any) => ({
        company_id: profile?.company_id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'pending',
        sort_order: task.sort_order,
        estimated_hours: task.estimated_hours,
        client_id: form.client_id || null,
      }))

      // Get the last created project
      const { data: lastProject } = await supabase
        .from('projects')
        .select('id')
        .eq('company_id', profile?.company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastProject) {
        const { error: tasksError } = await supabase.from('tasks').insert(
          newTasks.map((t: any) => ({ ...t, project_id: lastProject.id }))
        )
        if (tasksError) {
          console.error('Error creating template tasks:', tasksError)
        }
      }
    }

    router.push('/dashboard/projects')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a proyectos
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nuevo proyecto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crea un nuevo proyecto para tu agencia
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
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cliente</label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              >
                <option value="">Sin cliente asignado</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
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

            {/* Template */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Plantilla <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent"
                value={selectedTemplate?.id || ''}
                onChange={(e) => e.target.value ? selectTemplate(e.target.value) : setSelectedTemplate(null)}
              >
                <option value="">Sin plantilla</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.tasks_count || 0} tareas)
                  </option>
                ))}
              </select>
              {selectedTemplate && templateTasks.length > 0 && (
                <div className="mt-2 p-3 rounded-lg bg-gold/5 border border-gold/10">
                  <p className="text-xs font-medium text-gold-light mb-2">
                    {templateTasks.length} tareas de la plantilla "{selectedTemplate.name}":
                  </p>
                  <div className="space-y-1">
                    {templateTasks.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          task.priority === 'high' || task.priority === 'urgent'
                            ? 'bg-red-400' : task.priority === 'medium'
                            ? 'bg-gold-light' : 'bg-gray-400'
                        }`} />
                        {task.title}
                      </div>
                    ))}
                    {templateTasks.length > 5 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        +{templateTasks.length - 5} tareas más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Link href="/dashboard/projects">
            <Button type="button" variant="ghost">Cancelar</Button>
          </Link>
          <Button type="submit" className="lime-glow min-w-[140px]" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Creando...' : 'Crear proyecto'}
          </Button>
        </div>
      </form>
    </div>
  )
}
