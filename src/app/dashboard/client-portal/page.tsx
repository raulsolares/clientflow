'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Briefcase,
  CheckSquare2,
  FolderKanban,
  Clock,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  ExternalLink,
  Calendar,
  User,
  FileText,
  MessageSquare,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ClientProject {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  start_date: string | null
  end_date: string | null
  created_at: string
  client_id: string | null
}

interface ClientTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  project_id: string
  project?: { name: string }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-emerald-500/20 text-emerald-400' },
  planning: { label: 'Planificación', color: 'bg-blue-500/20 text-blue-400' },
  on_hold: { label: 'En pausa', color: 'bg-amber-500/20 text-amber-400' },
  completed: { label: 'Completado', color: 'bg-violet-500/20 text-violet-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
}

const taskStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-gray-500/20 text-gray-400' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/20 text-blue-400' },
  in_review: { label: 'En revisión', color: 'bg-amber-500/20 text-amber-400' },
  completed: { label: 'Completada', color: 'bg-emerald-500/20 text-emerald-400' },
}

const priorityColors: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
  urgent: 'text-red-500',
}

export default function ClientPortalPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [projects, setProjects] = useState<ClientProject[]>([])
  const [tasks, setTasks] = useState<ClientTask[]>([])
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!prof) { setLoading(false); setError('Perfil no encontrado'); return }

    setProfile(prof)
    const clientRole = prof.is_client || prof.role === 'viewer'
    setIsClient(clientRole)

    if (!prof.company_id) {
      setLoading(false)
      setError('No perteneces a ninguna empresa')
      return
    }

    try {
      // Load projects where user is a member
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)

      if (memberProjects && memberProjects.length > 0) {
        const projectIds = memberProjects.map((pm: any) => pm.project_id)
        const { data: projData } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds)
          .order('created_at', { ascending: false })

        if (projData) setProjects(projData)
      }

      // Load tasks visible to this user
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, project:projects(name)')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (taskData) setTasks(taskData)
    } catch (err: any) {
      if (err.message?.includes('relation') || err.code === '42P01') {
        setError('not_migrated')
      }
    }

    setLoading(false)
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime border-t-transparent" />
      </div>
    )
  }

  if (error === 'not_migrated') {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-amber-400 mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-1">Portal del Cliente</h2>
          <p className="text-sm text-muted-foreground">
            El portal del cliente requiere la migración de base de datos. Contacta al administrador.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const pendingTasks = tasks.filter((t) => t.status !== 'completed').length

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-lime/10 via-cyan/5 to-transparent border border-lime/10 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime/10">
            <User className="h-6 w-6 text-lime-light" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Bienvenido, {profile?.full_name?.split(' ')[0] || 'Cliente'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Este es tu portal personal. Aquí puedes ver el progreso de tus proyectos y tareas asignadas.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card glass>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <FolderKanban className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Mis Proyectos</p>
            </div>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckSquare2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedTasks}</p>
              <p className="text-xs text-muted-foreground">Completadas</p>
            </div>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingTasks}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Projects */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-lime-light" />
          Mis Proyectos
        </h2>
        {projects.length === 0 ? (
          <Card glass>
            <CardContent className="p-8 text-center">
              <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aún no tienes proyectos asignados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => {
              const status = statusConfig[project.status] || statusConfig.active
              return (
                <Card key={project.id} glass className="hover:border-lime/20 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{project.name}</h3>
                      <Badge className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {project.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(project.start_date).toLocaleDateString('es-MX')}
                        </span>
                      )}
                      {project.end_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(project.end_date).toLocaleDateString('es-MX')}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* My Tasks */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckSquare2 className="h-5 w-5 text-lime-light" />
          Mis Tareas
        </h2>
        {tasks.length === 0 ? (
          <Card glass>
            <CardContent className="p-8 text-center">
              <CheckSquare2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No tienes tareas asignadas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const status = taskStatusConfig[task.status] || taskStatusConfig.pending
              return (
                <Card key={task.id} glass className="hover:border-lime/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium text-foreground">{task.title}</h3>
                          <Badge className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                          {task.priority && (
                            <span className={`text-[10px] font-medium ${priorityColors[task.priority] || 'text-gray-400'}`}>
                              {task.priority === 'urgent' ? 'Urgente' :
                               task.priority === 'high' ? 'Alta' :
                               task.priority === 'medium' ? 'Media' : 'Baja'}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {task.project?.name && (
                            <span className="flex items-center gap-1">
                              <FolderKanban className="h-3 w-3" />
                              {task.project.name}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString('es-MX')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Contact section */}
      <Card glass>
        <CardContent className="p-5 flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime/10 shrink-0">
            <MessageSquare className="h-5 w-5 text-lime-light" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">¿Necesitas ayuda?</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Si tienes preguntas sobre tus proyectos o necesitas asistencia, contacta a tu administrador.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = 'mailto:admin@clientflow.com'}
              >
                <Mail className="h-3 w-3" />
                Enviar correo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/tasks')}
              >
                <ExternalLink className="h-3 w-3" />
                Ver todas las tareas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
