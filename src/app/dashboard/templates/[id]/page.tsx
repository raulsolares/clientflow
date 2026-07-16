'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Plus, Trash2, GripVertical,
  FileText, Clock, Save, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TemplateTask {
  id: string
  title: string
  description: string | null
  priority: string
  estimated_hours: number | null
  sort_order: number
  section: string | null
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  color: string | null
}

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [template, setTemplate] = useState<Template | null>(null)
  const [tasks, setTasks] = useState<TemplateTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskSection, setNewTaskSection] = useState('General')
  const [newTaskPriority, setNewTaskPriority] = useState<string>('medium')
  const [newTaskHours, setNewTaskHours] = useState<string>('')
  const isAdmin = true // Checked in load

  useEffect(() => {
    load()
  }, [params.id])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Load template
    const { data: tmpl } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!tmpl) { router.push('/dashboard/templates'); return }
    setTemplate(tmpl)

    // Load tasks
    const { data: tks } = await supabase
      .from('project_template_tasks')
      .select('*')
      .eq('template_id', params.id)
      .order('sort_order')

    if (tks) setTasks(tks)
    setLoading(false)
  }

  async function addTask() {
    if (!newTaskTitle.trim() || !template) return
    const supabase = createClient()

    const { data, error } = await supabase
      .from('project_template_tasks')
      .insert({
        template_id: template.id,
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        estimated_hours: newTaskHours ? parseFloat(newTaskHours) : null,
        section: newTaskSection === 'General' ? 'General' : newTaskSection,
        sort_order: tasks.length,
      })
      .select()
      .single()

    if (error) {
      alert('Error: ' + error.message)
    } else if (data) {
      setTasks(prev => [...prev, data])
      setNewTaskTitle('')
      setNewTaskHours('')
    }
  }

  async function deleteTask(taskId: string) {
    const supabase = createClient()
    await supabase.from('project_template_tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  async function updateTaskField(taskId: string, field: string, value: any) {
    const supabase = createClient()
    await supabase.from('project_template_tasks').update({ [field]: value }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } as TemplateTask : t))
  }

  async function useTemplate() {
    if (!template) return
    // Navigate to new project page with template_id
    router.push(`/dashboard/projects/new?template=${template.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gold-light" />
      </div>
    )
  }

  if (!template) return null

  // Group by section
  const sections = tasks.reduce<Record<string, TemplateTask[]>>((acc, t) => {
    const s = t.section || 'General'
    if (!acc[s]) acc[s] = []
    acc[s].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/dashboard/templates"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a plantillas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{template.name}</h1>
            <Badge variant="outline">{template.category}</Badge>
          </div>
          {template.description && (
            <p className="text-muted-foreground mt-1">{template.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">{tasks.length} tareas</p>
        </div>
        <Button variant="default" className="lime-glow" onClick={useTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Usar plantilla
        </Button>
      </div>

      {/* Add task */}
      <Card className="border-gold/20">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4">Agregar tarea</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Título de la tarea..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="h-10 rounded-lg border border-border/50 bg-card px-3 text-sm"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
              <Input
                type="number"
                placeholder="Horas"
                value={newTaskHours}
                onChange={(e) => setNewTaskHours(e.target.value)}
                className="w-20"
              />
              <Input
                placeholder="Sección"
                value={newTaskSection}
                onChange={(e) => setNewTaskSection(e.target.value)}
                className="w-32"
              />
            </div>
            <Button variant="default" className="lime-glow" onClick={addTask} disabled={!newTaskTitle.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks by section */}
      {Object.entries(sections).map(([sectionName, sectionTasks]) => (
        <div key={sectionName}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {sectionName}
          </h3>
          <div className="space-y-2">
            {sectionTasks.map((task) => (
              <Card key={task.id} className="group">
                <CardContent className="p-4 flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                      className="bg-transparent border-none text-foreground w-full focus:outline-none"
                    />
                  </div>
                  <Badge variant={task.priority === 'high' || task.priority === 'urgent' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                    {task.priority}
                  </Badge>
                  {task.estimated_hours && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {task.estimated_hours}h
                    </span>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Agrega las tareas que tendrá esta plantilla</p>
        </div>
      )}
    </div>
  )
}
