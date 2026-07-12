'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, List, ArrowLeft, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  assigned_to: string | null
  project_id: string | null
}

interface Project {
  id: string
  name: string
  color: string
}

interface Profile {
  id: string
  full_name: string | null
}

const columns = [
  { key: 'pending', label: 'Pendientes', color: 'border-t-amber-500', bg: 'bg-amber-500/5' },
  { key: 'in_progress', label: 'En progreso', color: 'border-t-blue-500', bg: 'bg-blue-500/5' },
  { key: 'review', label: 'Revisión', color: 'border-t-violet-500', bg: 'bg-violet-500/5' },
  { key: 'completed', label: 'Completadas', color: 'border-t-emerald-500', bg: 'bg-emerald-500/5' },
]

const priorityDot: Record<string, string> = {
  low: 'bg-gray-400',
  medium: 'bg-gold-light',
  high: 'bg-orange-400',
  urgent: 'bg-red-400',
}

export default function KanbanPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const dragOverCol = useRef<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) { setLoading(false); return }

      const [, { data: projectsData }, { data: membersData }] = await Promise.all([
        supabase.from('tasks').select('*').eq('company_id', profile.company_id).order('created_at'),
        supabase.from('projects').select('id, name, color').eq('company_id', profile.company_id).order('name'),
        supabase.from('profiles').select('id, full_name').eq('company_id', profile.company_id).order('full_name'),
      ])

      // Load tasks separately with simpler query
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('company_id', profile.company_id)
        .neq('status', 'cancelled')
        .order('created_at')
        .order('created_at', { ascending: false })

      if (tasksData) setTasks(tasksData)
      if (projectsData) setProjects(projectsData)
      if (membersData) setMembers(membersData)
      setLoading(false)
    }
    load()
  }, [router])

  function getProject(id: string | null) {
    return projects.find(p => p.id === id)
  }

  function getMember(id: string | null) {
    return members.find(m => m.id === id)
  }

  async function moveToStatus(taskId: string, newStatus: string) {
    const supabase = createClient()
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  // HTML5 Drag and Drop handlers
  function handleDragStart(taskId: string) {
    setDraggedTask(taskId)
  }

  function handleDragOver(e: React.DragEvent, status: string) {
    e.preventDefault()
    dragOverCol.current = status
  }

  function handleDrop(status: string) {
    if (draggedTask && draggedTask !== dragOverCol.current) {
      moveToStatus(draggedTask, status)
    }
    setDraggedTask(null)
    dragOverCol.current = null
  }

  const grouped = columns.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.status === col.key),
  }))

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/tasks"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Tareas
            </Link>
            <span className="text-border">/</span>
            <h1 className="text-2xl font-bold text-foreground">Kanban</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Arrastra las tareas entre columnas para cambiar su estado
          </p>
        </div>
        <Link href="/dashboard/tasks/new">
          <Button className="lime-glow">
            <Plus className="mr-2 h-4 w-4" />
            Nueva tarea
          </Button>
        </Link>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[60vh]">
        {grouped.map(col => (
          <div
            key={col.key}
            className={`rounded-xl border border-border/50 border-t-2 ${col.color} ${col.bg} backdrop-blur-sm flex flex-col`}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDrop={() => handleDrop(col.key)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{col.label}</span>
                <span className="text-xs text-muted-foreground bg-accent/40 rounded-full px-2 py-0.5">
                  {col.tasks.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
              {col.tasks.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground/50">
                  <p>Sin tareas</p>
                </div>
              )}

              {col.tasks.map(task => {
                const project = getProject(task.project_id)
                const member = getMember(task.assigned_to)
                return (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    className="block rounded-lg border border-border/40 bg-card/80 backdrop-blur-sm p-3 hover:border-gold/20 hover:bg-card transition-all duration-200 cursor-grab active:cursor-grabbing group"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex-1 min-w-0">
                        {/* Priority + Title */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityDot[task.priority] || 'bg-gray-400'}`} />
                          <span className="text-sm font-medium text-foreground line-clamp-2">{task.title}</span>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {project && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-accent/40 rounded-full px-2 py-0.5">
                              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: project.color || '#c9a961' }} />
                              {project.name}
                            </span>
                          )}
                          {member && (
                            <span className="text-[10px] text-muted-foreground">
                              {member.full_name || ''}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(task.due_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Add button at bottom */}
            <div className="p-3 border-t border-border/20">
              <Link
                href={`/dashboard/tasks/new`}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/40 py-2 text-xs text-muted-foreground hover:border-gold/30 hover:text-gold-light transition-all"
              >
                <Plus className="h-3 w-3" />
                Agregar tarea
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
