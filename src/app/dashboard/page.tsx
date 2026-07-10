'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Briefcase,
  ListChecks,
  Users,
  CheckCheck,
  Plus,
  Calendar,
  User,
  FolderKanban,
  ArrowRight,
  Clock,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DashboardStats {
  active_projects: number
  pending_tasks: number
  active_clients: number
  completed_today: number
  total_tasks: number
}

interface RecentTask {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  created_at: string
  project_id: string | null
  assigned_to: string | null
  projects?: { name: string; color: string } | null
  assignee?: { full_name: string } | null
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  in_review: { label: 'Revisión', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  completed: { label: 'Completada', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const priorityDot: Record<string, string> = {
  low: 'bg-gray-400',
  medium: 'bg-gold-light',
  high: 'bg-orange-400',
  urgent: 'bg-red-400',
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    active_projects: 0,
    pending_tasks: 0,
    active_clients: 0,
    completed_today: 0,
    total_tasks: 0,
  })
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) {
        setLoading(false)
        return
      }

      const companyId = profile.company_id
      const today = new Date().toISOString().split('T')[0]

      const [
        { count: activeProjects },
        { count: pendingTasks },
        { count: activeClients },
        { count: completedToday },
        { count: totalTasks },
        { data: recent },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'active'),
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['pending', 'in_progress', 'in_review']),
        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'active'),
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .gte('updated_at', today),
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('tasks')
          .select(`
            id, title, status, priority, due_date, created_at, project_id, assigned_to,
            projects!inner(name, color),
            assignee:profiles!tasks_assigned_to_fkey(full_name)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setStats({
        active_projects: activeProjects ?? 0,
        pending_tasks: pendingTasks ?? 0,
        active_clients: activeClients ?? 0,
        completed_today: completedToday ?? 0,
        total_tasks: totalTasks ?? 0,
      })
      if (recent) setRecentTasks(recent as unknown as RecentTask[])
      setLoading(false)
    }
    loadDashboard()
  }, [router])

  const statCards = [
    {
      label: 'Proyectos activos',
      value: stats.active_projects,
      icon: FolderKanban,
      color: 'from-blue-500/20 to-blue-600/10 text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Tareas pendientes',
      value: stats.pending_tasks,
      icon: ListChecks,
      color: 'from-amber-500/20 to-amber-600/10 text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Clientes activos',
      value: stats.active_clients,
      icon: Users,
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Completadas hoy',
      value: stats.completed_today,
      icon: CheckCheck,
      color: 'from-violet-500/20 to-violet-600/10 text-violet-400',
      bg: 'bg-violet-500/10',
    },
  ]

  const quickActions = [
    {
      label: 'Nuevo proyecto',
      href: '/dashboard/projects/new',
      icon: FolderKanban,
      description: 'Crear un nuevo proyecto',
    },
    {
      label: 'Nueva tarea',
      href: '/dashboard/tasks/new',
      icon: ListChecks,
      description: 'Añadir una tarea',
    },
    {
      label: 'Nuevo cliente',
      href: '/dashboard/clients/new',
      icon: Users,
      description: 'Registrar un cliente',
    },
  ]

  function timeAgo(dateStr: string) {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins} min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Hace ${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Ayer'
    return `Hace ${diffDays} días`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumen general de tu agencia
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      )}

      {/* Stats Cards */}
      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.label}
                  className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 hover:border-gold/20 transition-all duration-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg ${card.bg} p-2.5`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold text-foreground">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Acciones rápidas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card/30 p-4 hover:border-gold/20 hover:bg-card/50 transition-all duration-200"
                  >
                    <div className="rounded-lg bg-gold/10 p-2.5 group-hover:bg-gold/20 transition-colors">
                      <Icon className="h-5 w-5 text-gold-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{action.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-gold-light transition-colors shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent Activity + Stats overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gold-light" />
                    <h2 className="text-sm font-semibold text-foreground">Actividad reciente</h2>
                  </div>
                  <Link
                    href="/dashboard/tasks"
                    className="text-xs text-gold-light hover:text-gold transition-colors"
                  >
                    Ver todas
                  </Link>
                </div>

                {recentTasks.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <Activity className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Aún no hay actividad reciente
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {recentTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/dashboard/tasks/${task.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors group"
                      >
                        {/* Status icon */}
                        <div className={`h-2 w-2 rounded-full shrink-0 ${
                          task.status === 'completed'
                            ? 'bg-emerald-400'
                            : task.status === 'in_progress'
                            ? 'bg-blue-400'
                            : task.status === 'in_review'
                            ? 'bg-violet-400'
                            : 'bg-amber-400'
                        }`} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-gold-light transition-colors">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {/* Project */}
                            {(task as any).projects?.name && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: (task as any).projects?.color || '#c9a961' }}
                                />
                                {(task as any).projects?.name}
                              </span>
                            )}
                            {/* Assignee */}
                            {(task as any).assignee?.full_name && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <User className="h-3 w-3" />
                                {(task as any).assignee?.full_name}
                              </span>
                            )}
                            {/* Time */}
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {timeAgo(task.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <Badge className={`shrink-0 text-[10px] px-2 py-0.5 border hidden sm:inline-flex ${statusConfig[task.status]?.color || ''}`}>
                          {statusConfig[task.status]?.label || task.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mini stats card */}
            <div>
              <div className="rounded-xl border border-border/50 bg-card/30 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Resumen</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total proyectos</span>
                    <span className="text-sm font-semibold text-foreground">{stats.active_projects}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total tareas</span>
                    <span className="text-sm font-semibold text-foreground">{stats.total_tasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pendientes</span>
                    <span className="text-sm font-semibold text-amber-400">{stats.pending_tasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Clientes activos</span>
                    <span className="text-sm font-semibold text-foreground">{stats.active_clients}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completadas hoy</span>
                    <span className="text-sm font-semibold text-emerald-400">{stats.completed_today}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border/30">
                  <Link
                    href="/dashboard/tasks/new"
                    className="flex items-center justify-center gap-2 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold-light text-sm font-medium py-2.5 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva tarea
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
