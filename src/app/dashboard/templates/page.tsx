'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  FolderKanban, Plus, MoreHorizontal, Copy,
  Trash2, FileText, Clock, Calendar,
  ChevronDown, ChevronRight, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  color: string | null
  created_by: string | null
  created_at: string
  tasks_count?: number
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [creating, setCreating] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [templateTasks, setTemplateTasks] = useState<Record<string, any[]>>({})

  useEffect(() => {
    loadTemplates()
  }, [router])

  async function loadTemplates() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) { setLoading(false); return }
    setUserRole(profile.role)

    const { data } = await supabase
      .from('project_templates')
      .select('*')
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .order('name')

    if (data) {
      const enriched = await Promise.all(data.map(async (t) => {
        const { count } = await supabase
          .from('project_template_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('template_id', t.id)
        return { ...t, tasks_count: count || 0 }
      }))
      setTemplates(enriched)
    }
    setLoading(false)
  }

  async function createTemplate() {
    if (!newName.trim()) return
    setCreating(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) { setCreating(false); return }

    const { data, error } = await supabase
      .from('project_templates')
      .insert({
        company_id: profile.company_id,
        name: newName.trim(),
        description: newDesc.trim() || null,
        category: newCategory,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      alert('Error al crear plantilla: ' + error.message)
    } else if (data) {
      router.push(`/dashboard/templates/${data.id}`)
    }
    setCreating(false)
  }

  async function deleteTemplate(id: string) {
    if (!confirm('¿Eliminar esta plantilla permanentemente?')) return
    const supabase = createClient()
    await supabase.from('project_templates').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  async function toggleExpand(templateId: string) {
    if (expandedId === templateId) {
      setExpandedId(null)
      return
    }
    setExpandedId(templateId)
    if (!templateTasks[templateId]) {
      const supabase = createClient()
      const { data } = await supabase
        .from('project_template_tasks')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order')
      setTemplateTasks(prev => ({ ...prev, [templateId]: data || [] }))
    }
  }

  const isAdmin = userRole === 'admin' || userRole === 'manager'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gold-light" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plantillas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crea y reutiliza plantillas de proyectos con tareas predefinidas
          </p>
        </div>
        {isAdmin && (
          <Button variant="default" className="lime-glow" onClick={() => setShowNewForm(!showNewForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        )}
      </div>

      {/* New form */}
      {showNewForm && (
        <Card className="border-gold/20">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold">Crear nueva plantilla</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Sitio Web Corporativo"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Tipo de proyecto que cubre"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border/50 bg-card px-3 text-sm text-foreground"
                >
                  <option value="general">General</option>
                  <option value="web">Desarrollo Web</option>
                  <option value="marketing">Marketing</option>
                  <option value="diseno">Diseño</option>
                  <option value="consultoria">Consultoría</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowNewForm(false)}>Cancelar</Button>
              <Button variant="default" className="lime-glow" onClick={createTemplate} disabled={!newName.trim() || creating}>
                {creating ? 'Creando...' : 'Crear y agregar tareas'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      {templates.length === 0 && !showNewForm ? (
        <div className="text-center py-16">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No hay plantillas todavía</p>
          {isAdmin && (
            <Button variant="default" className="mt-4" onClick={() => setShowNewForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primera plantilla
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(t => (
            <Card key={t.id} className="hover:border-gold/30 transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                      <FolderKanban className="h-5 w-5 text-gold-light" />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/dashboard/templates/${t.id}`}>
                        <h3 className="font-semibold text-foreground truncate hover:text-gold-light transition-colors">
                          {t.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted-foreground">{t.category}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {t.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{t.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-3 border-t border-border/40">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {t.tasks_count} tareas
                  </span>
                  <button
                    onClick={() => toggleExpand(t.id)}
                    className="flex items-center gap-1 ml-auto hover:text-gold-light transition-colors"
                  >
                    {expandedId === t.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    Ver tareas
                  </button>
                </div>

                {/* Expanded tasks */}
                {expandedId === t.id && (
                  <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
                    {templateTasks[t.id]?.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin tareas definidas</p>
                    ) : (
                      templateTasks[t.id]?.map((task: any) => (
                        <div key={task.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-card-hover">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            task.priority === 'high' || task.priority === 'urgent'
                              ? 'bg-red-400' : task.priority === 'medium'
                              ? 'bg-gold-light' : 'bg-gray-400'
                          }`} />
                          <span className="text-foreground">{task.title}</span>
                          {task.estimated_hours && (
                            <span className="text-xs text-muted-foreground ml-auto">{task.estimated_hours}h</span>
                          )}
                        </div>
                      ))
                    )}
                    <Link
                      href={`/dashboard/templates/${t.id}`}
                      className="block text-xs text-gold-light hover:text-gold pt-1"
                    >
                      Editar tareas →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
