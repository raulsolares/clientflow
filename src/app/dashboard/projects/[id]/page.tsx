'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Edit3, Trash2, Plus, Clock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  start_date: string | null
  end_date: string | null
  client_id: string | null
  color: string
  created_at: string
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  assigned_to: string | null
}

const statusLabels: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planificación', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  active: { label: 'Activo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  on_hold: { label: 'En pausa', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completed: { label: 'Completado', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Load project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!projectData) { router.push('/dashboard/projects'); return }
      setProject(projectData)

      // Load tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })

      if (tasksData) setTasks(tasksData)
      setLoading(false)
    }
    load()
  }, [params.id, router])

  async function addTask() {
    if (!newTask.trim() || !project) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    await supabase.from('tasks').insert({
      company_id: profile?.company_id,
      project_id: project.id,
      title: newTask.trim(),
      status: 'pending',
      priority: 'medium',
    })

    setNewTask('')
    // Reload tasks
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
  }

  async function toggleTaskStatus(task: Task) {
    const supabase = createClient()
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  async function deleteProject() {
    if (!confirm('¿Estás seguro de eliminar este proyecto?')) return
    const supabase = createClient()
    await supabase.from('projects').delete().eq('id', params.id)
    router.push('/dashboard/projects')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  )

  if (!project) return null

  const taskCounts = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status !== 'completed').length,
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a proyectos
      </Link>

      {/* Project header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-3 w-3 rounded-full mt-1.5" style={{ backgroundColor: project.color || '#c9a961' }} />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={deleteProject} className="text-muted-foreground hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Meta badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className={`border ${statusLabels[project.status]?.color || ''}`}>
          {statusLabels[project.status]?.label || project.status}
        </Badge>
        {project.end_date && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Entrega: {new Date(project.end_date).toLocaleDateString('es-MX')}
          </span>
        )}
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {taskCounts.completed}/{taskCounts.total} tareas
        </span>
      </div>

      {/* Tasks section */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Tareas</span>
            <span className="text-sm font-normal text-muted-foreground">
              {taskCounts.pending} pendientes
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add task */}
          <div className="flex gap-2">
            <Input
              placeholder="Agregar tarea..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
            />
            <Button onClick={addTask} disabled={!newTask.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Task list */}
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay tareas aún. Agrega la primera.
            </p>
          )}

          <div className="space-y-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors group"
              >
                <button
                  onClick={() => toggleTaskStatus(task)}
                  className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                    task.status === 'completed'
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-border hover:border-gold/50'
                  }`}
                >
                  {task.status === 'completed' && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-sm ${
                  task.status === 'completed'
                    ? 'line-through text-muted-foreground'
                    : 'text-foreground'
                }`}>
                  {task.title}
                </span>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground">{task.due_date}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
