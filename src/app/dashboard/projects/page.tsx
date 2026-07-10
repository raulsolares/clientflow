'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Plus, FolderKanban, MoreHorizontal, Search,
  Users, ListChecks, Shield, Filter, UserCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
}

interface ProjectWithMembership {
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
  created_by: string | null
  task_count: number
  member_count: number
  user_role: string | null // 'owner' | 'manager' | 'editor' | 'viewer' | null
}

const statusLabels: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planificación', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  active: { label: 'Activo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  on_hold: { label: 'En pausa', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completed: { label: 'Completado', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'text-muted-foreground' },
  medium: { label: 'Media', color: 'text-gold-light' },
  high: { label: 'Alta', color: 'text-orange-400' },
}

const roleBadgeConfig: Record<string, { label: string; color: string; icon: any }> = {
  owner: { label: 'Dueño', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Shield },
  manager: { label: 'Manager', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: Shield },
  editor: { label: 'Editor', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: UserCheck },
  viewer: { label: 'Viewer', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: UserCheck },
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewFilter, setViewFilter] = useState<'all' | 'mine'>('mine')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [migrationNeeded, setMigrationNeeded] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) { setLoading(false); return }
      setUserRole(profile.role)

      const companyId = profile.company_id
      const userId = user.id
      const isAdmin = profile.role === 'admin'
      const isManager = profile.role === 'manager'
      const canSeeAll = isAdmin || isManager

      // Check project_members table and get memberships
      let userProjectIds: string[] = []
      let memberships: ProjectMember[] = []
      let membersTableExists = true

      try {
        const { data: myMemberships, error: membError } = await supabase
          .from('project_members')
          .select('id, project_id, user_id, role')
          .eq('user_id', userId)

        if (membError) {
          if (membError.code === '42P01' || membError.message?.includes('relation') || membError.code === 'PGRST116') {
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

      // Get all projects in company
      const { data: allProjects } = await supabase
        .from('projects')
        .select('id, name, description, status, priority, start_date, end_date, client_id, color, created_at, created_by')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      const projectsRaw = allProjects || []

      // For each project, compute task count, member count, and user role
      const enriched: ProjectWithMembership[] = []

      for (const p of projectsRaw) {
        // Determine if user can see this project
        const isCreator = p.created_by === userId
        const isMember = userProjectIds.includes(p.id)
        const shouldShow = canSeeAll || isCreator || isMember

        if (!shouldShow) continue

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

        // User's role
        let userRole: string | null = null
        if (isCreator) {
          userRole = 'owner'
        } else if (membersTableExists) {
          const membership = memberships.find(m => m.project_id === p.id)
          userRole = membership?.role || null
        }

        enriched.push({
          ...p,
          task_count: taskCount ?? 0,
          member_count: memberCount,
          user_role: userRole,
        })
      }

      setProjects(enriched)
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (viewFilter === 'mine' && p.user_role === null) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="lime-glow">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo proyecto
          </Button>
        </Link>
      </div>

      {/* Migration Banner */}
      {migrationNeeded && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-400 font-medium">
            ⚡ Migración pendiente
          </p>
          <p className="text-xs text-amber-400/70 mt-1">
            Ejecuta la migración SQL en supabase/migration_002_project_members.sql para habilitar membresías y roles.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* View filter toggle */}
        <div className="flex items-center gap-1 bg-card/50 rounded-lg border border-border/50 p-0.5">
          <button
            onClick={() => setViewFilter('mine')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewFilter === 'mine'
                ? 'bg-gold/10 text-gold-light'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Mis proyectos
          </button>
          <button
            onClick={() => setViewFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewFilter === 'all'
                ? 'bg-gold/10 text-gold-light'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            Todos
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proyectos..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            {search ? 'Sin resultados' : viewFilter === 'mine' ? 'No participas en ningún proyecto' : 'Aún no hay proyectos'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            {search
              ? `No se encontraron proyectos con "${search}"`
              : viewFilter === 'mine'
              ? 'Los proyectos donde seas miembro o creador aparecerán aquí.'
              : 'Crea tu primer proyecto para empezar a gestionar tu trabajo.'}
          </p>
          {!search && viewFilter === 'all' && (
            <Link href="/dashboard/projects/new">
              <Button className="mt-6 lime-glow">
                <Plus className="mr-2 h-4 w-4" />
                Crear primer proyecto
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Projects grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const RoleIcon = project.user_role ? roleBadgeConfig[project.user_role]?.icon : null
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="group rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 hover:border-gold/20 hover:bg-card/80 transition-all duration-200"
              >
                {/* Color bar + Role badge */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="h-1.5 rounded-full w-16"
                    style={{ backgroundColor: project.color || '#c9a961' }}
                  />
                  {project.user_role && (
                    <Badge
                      size="sm"
                      className={`shrink-0 text-[10px] px-2 py-0.5 border flex items-center gap-1 ${
                        roleBadgeConfig[project.user_role]?.color || ''
                      }`}
                    >
                      {RoleIcon && <RoleIcon className="h-2.5 w-2.5" />}
                      {roleBadgeConfig[project.user_role]?.label || project.user_role}
                    </Badge>
                  )}
                </div>

                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground group-hover:text-gold-light transition-colors line-clamp-1 text-sm">
                    {project.name}
                  </h3>
                  <Badge
                    size="sm"
                    className={`shrink-0 text-[10px] px-2 py-0.5 border ${
                      statusLabels[project.status]?.color || ''
                    }`}
                  >
                    {statusLabels[project.status]?.label || project.status}
                  </Badge>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}

                {/* Meta stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
                  <span className="flex items-center gap-1">
                    <ListChecks className="h-3 w-3" />
                    {project.task_count} tareas
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {project.member_count} miembros
                  </span>
                  <span className={`font-medium ml-auto ${priorityLabels[project.priority]?.color || ''}`}>
                    ● {priorityLabels[project.priority]?.label || project.priority}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
