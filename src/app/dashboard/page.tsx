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
  ChevronRight,
  UserPlus,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'

interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
}

interface DashboardStats {
  my_tasks: number
  my_projects: number
  team_members: number
  completed_today: number
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

interface ProjectSummary {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  color: string
  end_date: string | null
  created_by: string | null
  task_count: number
  member_count: number
  user_role: string | null
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  in_review: { label: 'Revisión', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  completed: { label: 'Completada', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const projectStatusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planificación', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  active: { label: 'Activo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  on_hold: { label: 'En pausa', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completed: { label: 'Completado', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const roleBadgeConfig: Record<string, { label: string; color: string }> = {
  manager: { label: 'Manager', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  editor: { label: 'Editor', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  viewer: { label: 'Viewer', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

const priorityDot: Record<string, string> = {
  low: 'bg-gray-400',
  medium: 'bg-gold-light',
  high: 'bg-orange-400',
  urgent: 'bg-red-400',
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    my_tasks: 0,
    my_projects: 0,
    team_members: 0,
    completed_today: 0,
  })
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [activeProjects, setActiveProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient()

      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, company_id')
        .eq('id', authUser.id)
        .single()

      if (!profileData?.company_id) {
        setLoading(false)
        return
      }
      setProfile(profileData)

      const companyId = profileData.company_id
      const userId = authUser.id
      const isAdmin = profileData.role === 'admin'
      const isManager = profileData.role === 'manager'
      const canSeeAll = isAdmin || isManager

      // Check if company is new (created today) for onboarding
      const { data: companyData } = await supabase
        .from('companies')
        .select('name, created_at')
        .eq('id', companyId)
        .single()

      if (companyData) {
        setCompanyName(companyData.name || 'Equipo')
        const createdDate = new Date(companyData.created_at)
        const today = new Date()
        const isSameDay =
          createdDate.getFullYear() === today.getFullYear() &&
          createdDate.getMonth() === today.getMonth() &&
          createdDate.getDate() === today.getDate()

        // Check if user has already completed onboarding (via localStorage)
        const onboardingKey = `onboarding_done_${companyId}`
        const alreadyDone = typeof window !== 'undefined' && localStorage.getItem(onboardingKey) === 'true'

        if (isSameDay && !alreadyDone) {
          setShowOnboarding(true)
        }
      }

      const today = new Date().toISOString().split('T')[0]

      // Check if project_members table exists and get user's memberships
      let userProjectIds: string[] = []
      let memberships: ProjectMember[] = []
      let membersTableExists = true

      try {
        const { data: myMemberships, error: membError } = await supabase
          .from('project_members')
          .select('id, project_id, user_id, role')
          .eq('user_id', userId)

        if (membError) {
          if (membError.code === 'PGRST116' || membError.message?.includes('relation') || membError.code === '42P01') {
            membersTableExists = false
            setMigrationNeeded(true)
          }
        } else {
          memberships = myMemberships || []
          userProjectIds = memberships.map(m => m.project_id)
        }
      } catch {
        membersTableExists = false
        setMigrationNeeded(true)
      }

      // Get team members count (company profiles)
      const { count: teamMembers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      // Build project query - admins see all, others see created + membership
      let projectIds: string[] = []
      let myProjectsData: any[] = []

      if (canSeeAll) {
        // Admin/manager: get all projects
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id, name, description, status, priority, color, end_date, created_by')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(6)

        myProjectsData = allProjects || []
        projectIds = myProjectsData.map(p => p.id)
      } else {
        // Non-admin: get projects where user is creator OR member
        const { data: createdProjects } = await supabase
          .from('projects')
          .select('id, name, description, status, priority, color, end_date, created_by')
          .eq('company_id', companyId)
          .eq('created_by', userId)
          .order('created_at', { ascending: false })

        const createdIds = (createdProjects || []).map(p => p.id)
        const memberIds = userProjectIds.filter(id => !createdIds.includes(id))

        // Fetch membership-only projects
        let memberProjects: any[] = []
        if (memberIds.length > 0 && membersTableExists) {
          const { data: mp } = await supabase
            .from('projects')
            .select('id, name, description, status, priority, color, end_date, created_by')
            .in('id', memberIds)
            .order('created_at', { ascending: false })
          memberProjects = mp || []
        }

        myProjectsData = [...(createdProjects || []), ...memberProjects]
        projectIds = myProjectsData.map(p => p.id)
        // Deduplicate
        const seen = new Set<string>()
        myProjectsData = myProjectsData.filter(p => {
          if (seen.has(p.id)) return false
          seen.add(p.id)
          return true
        })
      }

      // Get task counts
      // My Tasks (assigned to me)
      let myTasksQuery = supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      if (!canSeeAll) {
        myTasksQuery = myTasksQuery.eq('assigned_to', userId)
      }

      const { count: myTasksCount } = await myTasksQuery

      // Completed today
      const { count: completedCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('updated_at', today)

      // My recent tasks (last 5)
      let recentQuery = supabase
        .from('tasks')
        .select(`
          id, title, status, priority, due_date, created_at, project_id, assigned_to,
          projects!inner(name, color),
          assignee:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .eq('company_id', companyId)

      if (!canSeeAll) {
        recentQuery = recentQuery.eq('assigned_to', userId)
      }

      const { data: recentData } = await recentQuery
        .order('created_at', { ascending: false })
        .limit(5)

      // For each project, get task count and member count
      const projectSummaries: ProjectSummary[] = []

      for (const p of myProjectsData) {
        // Task count
        const { count: taskCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', p.id)

        // Member count
        let memberCount = 0
        if (membersTableExists) {
          const { count: mc } = await supabase
            .from('project_members')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', p.id)
          memberCount = mc ?? 0
        }

        // User's role in this project
        let userRole: string | null = null
        if (p.created_by === userId) {
          userRole = 'owner'
        } else if (membersTableExists) {
          const membership = memberships.find(m => m.project_id === p.id)
          userRole = membership?.role || null
        }

        projectSummaries.push({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          priority: p.priority,
          color: p.color,
          end_date: p.end_date,
          created_by: p.created_by,
          task_count: taskCount ?? 0,
          member_count: memberCount,
          user_role: userRole,
        })
      }

      setStats({
        my_tasks: myTasksCount ?? 0,
        my_projects: projectSummaries.length,
        team_members: teamMembers ?? 0,
        completed_today: completedCount ?? 0,
      })

      if (recentData) setRecentTasks(recentData as unknown as RecentTask[])
      setActiveProjects(projectSummaries)
      setLoading(false)
    }
    loadDashboard()
  }, [router])

  function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const statCards = [
    {
      label: 'Mis tareas',
      value: stats.my_tasks,
      icon: ListChecks,
      color: 'from-blue-500/20 to-blue-600/10 text-blue-400',
      bg: 'bg-blue-500/10',
      href: '/dashboard/tasks',
    },
    {
      label: 'Mis proyectos',
      value: stats.my_projects,
      icon: FolderKanban,
      color: 'from-amber-500/20 to-amber-600/10 text-amber-400',
      bg: 'bg-amber-500/10',
      href: '/dashboard/projects',
    },
    {
      label: 'Miembros del equipo',
      value: stats.team_members,
      icon: Users,
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400',
      bg: 'bg-emerald-500/10',
      href: '/dashboard/team',
    },
    {
      label: 'Completadas hoy',
      value: stats.completed_today,
      icon: CheckCheck,
      color: 'from-violet-500/20 to-violet-600/10 text-violet-400',
      bg: 'bg-violet-500/10',
      href: '/dashboard/tasks',
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
      label: 'Invitar miembro',
      href: '/dashboard/team/invite',
      icon: UserPlus,
      description: 'Invitar al equipo',
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

  function getRoleBadge(role: string | null) {
    if (!role) return null
    if (role === 'owner') {
      return (
        <Badge variant="secondary" size="sm" className="bg-amber-500/15 text-amber-400 border-amber-500/20">
          <Shield className="h-3 w-3 mr-0.5" />
          Dueño
        </Badge>
      )
    }
    const config = roleBadgeConfig[role]
    if (!config) return null
    return (
      <Badge variant="secondary" size="sm" className={config.color.replace('text-', 'bg-').split(' ')[0] + ' ' + config.color}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con saludo */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {getGreeting()}, {profile?.full_name || user?.email?.split('@')[0] || 'Usuario'}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.role === 'admin'
            ? 'Panel de administración — visión general de toda la empresa'
            : 'Resumen personalizado de tu trabajo'
          }
        </p>
      </div>

      {/* Migration Needed Banner */}
      {migrationNeeded && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-400 font-medium">
            ⚡ Migración pendiente
          </p>
          <p className="text-xs text-amber-400/70 mt-1">
            Ejecuta la migración SQL en supabase/migration_002_project_members.sql para habilitar la gestión completa de miembros y membresías de proyectos.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon
              return (
                <Link key={card.label} href={card.href}>
                  <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 hover:border-gold/20 transition-all duration-200 hover:shadow-sm cursor-pointer">
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
                </Link>
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Tasks */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gold-light" />
                    <h2 className="text-sm font-semibold text-foreground">Mis tareas recientes</h2>
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
                      No tienes tareas asignadas aún
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
                        <div className={`h-2 w-2 rounded-full shrink-0 ${
                          task.status === 'completed'
                            ? 'bg-emerald-400'
                            : task.status === 'in_progress'
                            ? 'bg-blue-400'
                            : task.status === 'in_review'
                            ? 'bg-violet-400'
                            : 'bg-amber-400'
                        }`} />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-gold-light transition-colors">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {(task as any).projects?.name && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: (task as any).projects?.color || '#c9a961' }}
                                />
                                {(task as any).projects?.name}
                              </span>
                            )}
                            {(task as any).assignee?.full_name && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <User className="h-3 w-3" />
                                {(task as any).assignee?.full_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {timeAgo(task.created_at)}
                            </span>
                          </div>
                        </div>

                        <Badge className={`shrink-0 text-[10px] px-2 py-0.5 border hidden sm:inline-flex ${statusConfig[task.status]?.color || ''}`} size="sm">
                          {statusConfig[task.status]?.label || task.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Summary Card */}
            <div>
              <div className="rounded-xl border border-border/50 bg-card/30 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Resumen</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mis tareas</span>
                    <span className="text-sm font-semibold text-foreground">{stats.my_tasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mis proyectos</span>
                    <span className="text-sm font-semibold text-foreground">{stats.my_projects}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Miembros del equipo</span>
                    <span className="text-sm font-semibold text-foreground">{stats.team_members}</span>
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

          {/* My Active Projects */}
          {activeProjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {profile?.role === 'admin' ? 'Proyectos activos' : 'Mis proyectos activos'}
                </h2>
                <Link
                  href="/dashboard/projects"
                  className="text-xs text-gold-light hover:text-gold transition-colors flex items-center gap-1"
                >
                  Ver todos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="group rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 hover:border-gold/20 hover:bg-card/80 transition-all duration-200"
                  >
                    {/* Color bar */}
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="h-1.5 rounded-full w-16"
                        style={{ backgroundColor: project.color || '#c9a961' }}
                      />
                      {getRoleBadge(project.user_role)}
                    </div>

                    {/* Title & Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground group-hover:text-gold-light transition-colors line-clamp-1 text-sm">
                        {project.name}
                      </h3>
                      <Badge className={`shrink-0 text-[10px] px-2 py-0.5 border ${projectStatusConfig[project.status]?.color || ''}`} size="sm">
                        {projectStatusConfig[project.status]?.label || project.status}
                      </Badge>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {project.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ListChecks className="h-3 w-3" />
                        {project.task_count} tareas
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project.member_count} miembros
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Onboarding Modal */}
      <OnboardingModal
        open={showOnboarding}
        companyName={companyName}
        onComplete={() => {
          setShowOnboarding(false)
          if (profile?.company_id) {
            localStorage.setItem(`onboarding_done_${profile.company_id}`, 'true')
          }
        }}
      />
    </div>
  )
}
