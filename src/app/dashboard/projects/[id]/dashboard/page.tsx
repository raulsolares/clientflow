'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Calendar, Clock, Users, CheckCircle2,
  Circle, AlertCircle, Timer, BarChart3, Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardData {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  pendingTasks: number
  overdueTasks: number
  totalEstimated: number
  totalSpent: number
  members: { id: string; full_name: string; email: string; task_count: number; role: string }[]
  recentActivity: { id: string; task_title: string; status: string; updated_at: string }[]
  tasksByStatus: Record<string, number>
}

export default function ProjectDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

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
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', params.id)

      const tasksList = tasks || []

      // Calculate task stats
      const totalTasks = tasksList.length
      const completedTasks = tasksList.filter((t: any) => t.status === 'completed').length
      const inProgressTasks = tasksList.filter((t: any) => t.status === 'in_progress').length
      const pendingTasks = tasksList.filter((t: any) => t.status === 'pending').length
      const reviewTasks = tasksList.filter((t: any) => t.status === 'review').length
      const cancelledTasks = tasksList.filter((t: any) => t.status === 'cancelled').length

      const now = new Date()
      const overdueTasks = tasksList.filter((t: any) =>
        t.due_date && new Date(t.due_date) < now && t.status !== 'completed' && t.status !== 'cancelled'
      ).length

      const totalEstimated = tasksList.reduce((sum: number, t: any) =>
        sum + (t.time_estimated || t.estimated_hours || 0), 0)
      const totalSpent = tasksList.reduce((sum: number, t: any) =>
        sum + (t.time_spent || 0), 0)

      // Tasks by status for chart
      const tasksByStatus: Record<string, number> = {
        pending: pendingTasks,
        in_progress: inProgressTasks,
        review: reviewTasks,
        completed: completedTasks,
        cancelled: cancelledTasks,
      }

      // Load members with task counts
      const { data: membersRaw } = await supabase
        .from('project_members')
        .select('user_id, role')

      const memberIds = [...new Set((membersRaw || []).map((m: any) => m.user_id))]

      let members: DashboardData['members'] = []
      if (memberIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', memberIds)

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

        members = (membersRaw || []).map((m: any) => {
          const profile = profileMap.get(m.user_id) || { full_name: 'Usuario', email: '' }
          const taskCount = tasksList.filter((t: any) => t.assigned_to === m.user_id).length
          return {
            id: m.user_id,
            full_name: profile.full_name || 'Usuario',
            email: profile.email || '',
            task_count: taskCount,
            role: m.role,
          }
        }).filter((m, i, arr) => arr.findIndex(a => a.id === m.id) === i) // deduplicate
      }

      // Recent activity - tasks updated in last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentActivity = tasksList
        .filter((t: any) => new Date(t.updated_at || t.created_at) >= sevenDaysAgo)
        .sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
        .slice(0, 10)
        .map((t: any) => ({
          id: t.id,
          task_title: t.title,
          status: t.status,
          updated_at: t.updated_at || t.created_at,
        }))

      setData({
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        overdueTasks,
        totalEstimated,
        totalSpent,
        members,
        recentActivity,
        tasksByStatus,
      })

      setLoading(false)
    }
    load()
  }, [params.id, router])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  )

  if (!project || !data) return null

  const statusColorMap: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-500', text: 'text-amber-400', label: 'Pendientes' },
    in_progress: { bg: 'bg-blue-500', text: 'text-blue-400', label: 'En progreso' },
    review: { bg: 'bg-violet-500', text: 'text-violet-400', label: 'Revisión' },
    completed: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Completadas' },
    cancelled: { bg: 'bg-red-500', text: 'text-red-400', label: 'Canceladas' },
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En progreso',
    review: 'Revisión',
    completed: 'Completada',
    cancelled: 'Cancelada',
  }

  const maxTasks = Math.max(...Object.values(data.tasksByStatus), 1)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/dashboard/projects/${params.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al proyecto
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color || '#c9a961' }} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard: {project.name}</h1>
          <p className="text-sm text-muted-foreground">Resumen y métricas del proyecto</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card glass>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{data.totalTasks}</p>
              <p className="text-xs text-muted-foreground">Total tareas</p>
            </div>
          </CardContent>
        </Card>

        <Card glass>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{data.completedTasks}</p>
              <p className="text-xs text-muted-foreground">Completadas</p>
            </div>
          </CardContent>
        </Card>

        <Card glass>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{data.inProgressTasks}</p>
              <p className="text-xs text-muted-foreground">En progreso</p>
            </div>
          </CardContent>
        </Card>

        <Card glass>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{data.overdueTasks}</p>
              <p className="text-xs text-muted-foreground">Vencidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks by status chart */}
        <Card glass className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Tareas por estado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.tasksByStatus).map(([status, count]) => {
              const config = statusColorMap[status] || { bg: 'bg-gray-500', text: 'text-gray-400', label: status }
              const pct = maxTasks > 0 ? (count / maxTasks) * 100 : 0
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${config.bg}`} />
                      {config.label}
                    </span>
                    <span className="font-medium text-foreground">{count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-accent/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${config.bg}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}

            {data.totalTasks === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay tareas en este proyecto
              </p>
            )}
          </CardContent>
        </Card>

        {/* Time summary */}
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Tiempo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/30 bg-accent/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">Total estimado</p>
              <p className="text-xl font-bold text-foreground">{data.totalEstimated.toFixed(1)}h</p>
            </div>
            <div className="rounded-lg border border-border/30 bg-accent/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">Total registrado</p>
              <p className={`text-xl font-bold ${
                data.totalSpent > data.totalEstimated && data.totalEstimated > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {data.totalSpent.toFixed(1)}h
              </p>
            </div>

            {data.totalEstimated > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progreso</span>
                  <span>{Math.min(100, Math.round((data.totalSpent / data.totalEstimated) * 100))}%</span>
                </div>
                <div className="h-2 rounded-full bg-accent/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      data.totalSpent > data.totalEstimated
                        ? 'bg-amber-500'
                        : 'bg-gold-light'
                    }`}
                    style={{ width: `${Math.min(100, (data.totalSpent / data.totalEstimated) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members with task counts */}
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              Miembros ({data.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin miembros asignados
              </p>
            )}
            {data.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-gold/20 flex items-center justify-center text-xs font-medium text-gold-light shrink-0">
                    {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.full_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.role} {member.email ? `· ${member.email}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-lg font-bold text-foreground">{member.task_count}</p>
                  <p className="text-[10px] text-muted-foreground">tareas</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Actividad reciente (7 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin actividad reciente
              </p>
            )}
            {data.recentActivity.map((activity) => (
              <Link
                key={activity.id}
                href={`/dashboard/tasks/${activity.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${
                    activity.status === 'completed' ? 'bg-emerald-500' :
                    activity.status === 'in_progress' ? 'bg-blue-500' :
                    activity.status === 'review' ? 'bg-violet-500' :
                    activity.status === 'cancelled' ? 'bg-red-500' :
                    'bg-amber-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate group-hover:text-gold-light transition-colors">
                      {activity.task_title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabels[activity.status] || activity.status}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {new Date(activity.updated_at).toLocaleDateString('es-MX', {
                    day: 'numeric', month: 'short'
                  })}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
