'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, CheckSquare2, Columns, MoreHorizontal,
  Calendar, User, FolderKanban, Filter, UserCheck, Eye, EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  assigned_to: string | null
  project_id: string | null
  created_at: string
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

interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  review: { label: 'Revisión', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  completed: { label: 'Completada', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: 'Baja', color: 'text-muted-foreground', dot: 'bg-gray-400' },
  medium: { label: 'Media', color: 'text-gold-light', dot: 'bg-gold-light' },
  high: { label: 'Alta', color: 'text-orange-400', dot: 'bg-orange-400' },
  urgent: { label: 'Urgente', color: 'text-red-400', dot: 'bg-red-400' },
}

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showMyTasks, setShowMyTasks] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [hideCompleted, setHideCompleted] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) { setLoading(false); return }
      setUserRole(profile.role)

      const companyId = profile.company_id
      const userId = user.id
      const isAdmin = profile.role === 'admin'
      const isManager = profile.role === 'manager'
      const canSeeAll = isAdmin || isManager

      // Get visible project IDs (user is member or creator; admin sees all)
      let visibleProjectIds: string[] = []
      let membersTableExists = true

      if (!canSeeAll) {
        try {
          const { data: myMemberships, error: membError } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', userId)

          if (membError) {
            if (membError.code === '42P01' || membError.message?.includes('relation') || membError.code === 'PGRST116') {
              membersTableExists = false
            }
          } else {
            visibleProjectIds = (myMemberships || []).map(m => m.project_id)
          }
        } catch {
          membersTableExists = false
        }

        // Also add projects where user is creator
        const { data: createdProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('company_id', companyId)
          .eq('created_by', userId)

        if (createdProjects) {
          for (const p of createdProjects) {
            if (!visibleProjectIds.includes(p.id)) {
              visibleProjectIds.push(p.id)
            }
          }
        }
      }

      // Fetch projects visible to the user
      let projectsQuery = supabase
        .from('projects')
        .select('id, name, color')
        .eq('company_id', companyId)
        .order('name')

      if (!canSeeAll && visibleProjectIds.length > 0) {
        projectsQuery = projectsQuery.in('id', visibleProjectIds)
      } else if (!canSeeAll) {
        // No visible projects
        setProjects([])
      }

      const [{ data: tasksData }, { data: projectsData }, { data: membersData }] = await Promise.all([
        supabase.from('tasks').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        projectsQuery,
        supabase.from('profiles').select('id, full_name').eq('company_id', companyId).order('full_name'),
      ])

      // Filter tasks to only show visible projects
      let visibleTasks = tasksData || []
      if (!canSeeAll && visibleProjectIds.length > 0) {
        visibleTasks = visibleTasks.filter(t =>
          t.project_id === null || visibleProjectIds.includes(t.project_id)
        )
      }

      if (projectsData) setProjects(projectsData)
      if (membersData) setMembers(membersData)

      // Apply "my tasks" default filter
      if (showMyTasks) {
        visibleTasks = visibleTasks.filter(t => t.assigned_to === userId)
      }

      setTasks(visibleTasks)
      setLoading(false)
    }
    load()
  }, [router, showMyTasks])

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (hideCompleted && t.status === 'completed') return false
    if (projectFilter !== 'all' && t.project_id !== projectFilter) return false
    if (assigneeFilter !== 'all' && t.assigned_to !== assigneeFilter) return false
    return true
  })

  async function toggleStatus(task: Task) {
    const supabase = createClient()
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  function getProject(id: string | null) {
    return projects.find(p => p.id === id)
  }

  function getMember(id: string | null) {
    return members.find(m => m.id === id)
  }

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }

  const statusTabs = [
    { key: 'all', label: 'Todas', count: counts.all },
    { key: 'pending', label: 'Pendientes', count: counts.pending },
    { key: 'in_progress', label: 'En progreso', count: counts.in_progress },
    { key: 'review', label: 'Revisión', count: counts.review },
    { key: 'completed', label: 'Completadas', count: counts.completed },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tareas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en total
            {showMyTasks && ' • Mostrando solo mis tareas'}
            {hideCompleted && ' • Ocultando completadas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/tasks/kanban">
            <Button variant="ghost" className="text-muted-foreground">
              <Columns className="mr-2 h-4 w-4" />
              Kanban
            </Button>
          </Link>
          <Link href="/dashboard/tasks/new">
            <Button className="lime-glow">
              <Plus className="mr-2 h-4 w-4" />
              Nueva tarea
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Toggle row */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMyTasks(!showMyTasks)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 border ${
              showMyTasks
                ? 'bg-gold/10 text-gold-light border-gold/20'
                : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-accent/30'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Mis tareas
          </button>
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 border ${
              hideCompleted
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-accent/30'
            }`}
          >
            {hideCompleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {hideCompleted ? 'Ocultar completadas' : 'Mostrar completadas'}
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                statusFilter === tab.key
                  ? 'bg-gold/10 text-gold-light border border-gold/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/30 border border-transparent'
              }`}
            >
              {tab.label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                statusFilter === tab.key ? 'bg-gold/20 text-gold-light' : 'bg-accent/50 text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tareas..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground max-w-[200px]"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="all">Todos los proyectos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground max-w-[200px]"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="all">Todos los asignados</option>
            <option value={currentUserId || ''}>Asignadas a mí</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.full_name || 'Sin nombre'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-16 text-center">
          <CheckSquare2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            {search || statusFilter !== 'all' || projectFilter !== 'all' || assigneeFilter !== 'all'
              ? 'Sin resultados'
              : showMyTasks
              ? 'No tienes tareas asignadas'
              : 'Aún no hay tareas'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            {search || statusFilter !== 'all' || projectFilter !== 'all' || assigneeFilter !== 'all'
              ? 'Intenta con otros filtros de búsqueda'
              : showMyTasks
              ? 'Las tareas asignadas a ti aparecerán aquí.'
              : 'Crea tu primera tarea para empezar a gestionar tu trabajo.'}
          </p>
          {!search && statusFilter === 'all' && projectFilter === 'all' && assigneeFilter === 'all' && !showMyTasks && (
            <Link href="/dashboard/tasks/new">
              <Button className="mt-6 lime-glow">
                <Plus className="mr-2 h-4 w-4" />
                Crear primera tarea
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Task list */}
      {!loading && filtered.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
          <div className="divide-y divide-border/30">
            {filtered.map((task) => {
              const project = getProject(task.project_id)
              const member = getMember(task.assigned_to)
              return (
                <Link
                  key={task.id}
                  href={`/dashboard/tasks/${task.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors group"
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.preventDefault(); toggleStatus(task) }}
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

                  {/* Priority dot + Title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${priorityConfig[task.priority]?.dot || 'bg-gray-400'}`} />
                      <span className={`text-sm font-medium truncate ${
                        task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}>
                        {task.title}
                      </span>
                    </div>
                  </div>

                  {/* Project badge */}
                  {project && (
                    <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-accent/40 rounded-full px-2.5 py-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color || '#c9a961' }} />
                      {project.name}
                    </span>
                  )}

                  {/* Assignee */}
                  {member && (
                    <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {member.full_name || 'Sin nombre'}
                    </span>
                  )}

                  {/* Due date */}
                  {task.due_date && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.due_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </span>
                  )}

                  {/* Status badge - always visible */}
                  <Badge className={`shrink-0 text-[11px] px-2 py-0.5 border ${statusConfig[task.status]?.color || ''}`} size="sm">
                    {statusConfig[task.status]?.label || task.status}
                  </Badge>

                  <MoreHorizontal className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
