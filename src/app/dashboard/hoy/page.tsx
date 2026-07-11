'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { format, addDays, isSameDay, startOfDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Sun,
  Moon,
  CloudSun,
  ListChecks,
  CheckCircle2,
  CalendarDays,
  ClipboardPen,
  FileText,
  Users,
  FolderKanban,
  Clock,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  project_id: string | null
  assigned_to: string | null
  projects?: { name: string; color: string } | null
}

interface Profile {
  full_name: string | null
  email: string | null
  role: string
  company_id: string | null
}

interface MiniStats {
  tasksToday: number
  projectsActive: number
  teamMembers: number
}

const priorityDot: Record<string, string> = {
  low: 'bg-gray-400',
  medium: 'bg-gold-light',
  high: 'bg-orange-400',
  urgent: 'bg-red-400',
}

function getGreeting(): { text: string; icon: React.ElementType } {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Buenos días', icon: Sun }
  if (hour < 18) return { text: 'Buenas tardes', icon: CloudSun }
  return { text: 'Buenas noches', icon: Moon }
}

function getTodayDate(): string {
  const now = new Date()
  return format(now, "EEEE, d 'de' MMMM 'del' yyyy", { locale: es })
}

function formatDayName(date: Date): string {
  return format(date, 'EEE', { locale: es })
}

function formatDayNumber(date: Date): string {
  return format(date, 'd')
}

export default function HoyPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<MiniStats>({ tasksToday: 0, projectsActive: 0, teamMembers: 0 })
  const [quickNote, setQuickNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())

  // Load data
  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, role, company_id')
        .eq('id', user.id)
        .single()

      if (!profileData?.company_id) {
        setProfile(profileData)
        setLoading(false)
        return
      }

      setProfile(profileData)

      const companyId = profileData.company_id
      const userId = user.id
      const isAdmin = profileData.role === 'admin'
      const isManager = profileData.role === 'manager'
      const canSeeAll = isAdmin || isManager

      const today = new Date().toISOString().split('T')[0]
      const tomorrow = addDays(new Date(), 1).toISOString().split('T')[0]
      const threeDaysLater = addDays(new Date(), 4).toISOString().split('T')[0]

      // Today's tasks (due today, not completed, not archived)
      let todayQuery = supabase
        .from('tasks')
        .select(`id, title, status, priority, due_date, project_id, assigned_to, projects!inner(name, color)`)
        .eq('company_id', companyId)
        .eq('due_date', today)
        .neq('status', 'completed')
        .is('archived_at', null)
        .order('priority', { ascending: false })

      if (!canSeeAll) {
        todayQuery = todayQuery.eq('assigned_to', userId)
      }

      const { data: todayData } = await todayQuery
      setTodayTasks((todayData || []) as any as Task[])
      setStats(prev => ({ ...prev, tasksToday: ((todayData || []) as any as Task[]).length }))

      // Upcoming tasks (next 3 due after today, not completed, not archived)
      let upcomingQuery = supabase
        .from('tasks')
        .select(`id, title, status, priority, due_date, project_id, assigned_to, projects!inner(name, color)`)
        .eq('company_id', companyId)
        .gte('due_date', tomorrow)
        .lt('due_date', threeDaysLater)
        .neq('status', 'completed')
        .is('archived_at', null)
        .order('due_date', { ascending: true })
        .limit(3)

      if (!canSeeAll) {
        upcomingQuery = upcomingQuery.eq('assigned_to', userId)
      }

      const { data: upcomingData } = await upcomingQuery
      setUpcomingTasks((upcomingData || []) as any as Task[])

      // Stats
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['active', 'planning'])

      const { count: membersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      setStats({
        tasksToday: ((todayData || []) as any as Task[]).length,
        projectsActive: projectsCount ?? 0,
        teamMembers: membersCount ?? 0,
      })

      setLoading(false)
    }
    load()

    // Load quick note from localStorage
    const savedNote = localStorage.getItem('hoy_quick_note')
    if (savedNote) {
      setQuickNote(savedNote)
    }
  }, [router])

  const saveNote = useCallback(() => {
    localStorage.setItem('hoy_quick_note', quickNote)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }, [quickNote])

  const completeTask = async (taskId: string) => {
    setCompletingIds((prev) => new Set(prev).add(taskId))
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId)

      if (!error) {
        setTodayTasks((prev) => prev.filter((t) => t.id !== taskId))
        setStats((prev) => ({ ...prev, tasksToday: prev.tasksToday - 1 }))
      }
    } catch {
      // ignore
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  // Agenda: today + next 3 days with dot indicators
  const agendaDays = [0, 1, 2, 3].map((offset) => addDays(new Date(), offset))
  const todayStr = new Date().toISOString().split('T')[0]

  const GreetingIcon = getGreeting().icon
  const greetingText = getGreeting().text
  const todayDateStr = getTodayDate()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-gold/5 via-card/50 to-card/30 p-6 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GreetingIcon className="h-5 w-5 text-gold-light" />
              <h1 className="text-2xl font-bold text-foreground">
                {greetingText}, {profile?.full_name?.split(' ')[0] || 'Usuario'}!
              </h1>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {todayDateStr}
            </p>
          </div>
          <div className="hidden sm:block">
            <Sparkles className="h-6 w-6 text-gold-light/40" />
          </div>
        </div>
      </div>

      {/* Stats Mini-Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-blue-500/10 p-1.5">
              <ListChecks className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pendientes hoy</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.tasksToday}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-amber-500/10 p-1.5">
              <FolderKanban className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Proyectos activos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.projectsActive}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-emerald-500/10 p-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Equipo</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.teamMembers}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Today's Tasks + Quick Note */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks */}
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-foreground">Tareas de hoy</h2>
                {stats.tasksToday > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-gold/10 text-gold-light px-2 py-0.5 text-[10px] font-medium">
                    {stats.tasksToday}
                  </span>
                )}
              </div>
              <Link
                href="/dashboard/tasks/new"
                className="text-xs text-gold-light hover:text-gold transition-colors"
              >
                + Nueva
              </Link>
            </div>

            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-5">
                <div className="rounded-full bg-emerald-500/10 p-3 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-foreground">¡Todo listo!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No tienes tareas pendientes para hoy
                </p>
                <Link
                  href="/dashboard/tasks/new"
                  className="mt-3 text-xs font-medium text-gold-light hover:text-gold transition-colors"
                >
                  Crear una tarea →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors group"
                  >
                    <button
                      onClick={() => completeTask(task.id)}
                      disabled={completingIds.has(task.id)}
                      className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/40 transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      {completingIds.has(task.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-transparent group-hover:bg-emerald-400/50 transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.projects?.name && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: task.projects.color || '#c9a961' }}
                            />
                            {task.projects.name}
                          </span>
                        )}
                        {task.priority && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[task.priority] || 'bg-gray-400'}`} />
                            {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/tasks/${task.id}`}
                      className="shrink-0 text-muted-foreground/40 hover:text-gold-light transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Note */}
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardPen className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-foreground">Nota rápida</h2>
              </div>
              <div className="flex items-center gap-2">
                {noteSaved && (
                  <span className="text-[11px] text-emerald-400">Guardado</span>
                )}
                <button
                  onClick={saveNote}
                  className="text-[11px] font-medium text-gold-light hover:text-gold transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
            <textarea
              value={quickNote}
              onChange={(e) => {
                setQuickNote(e.target.value)
                setNoteSaved(false)
              }}
              placeholder="Escribe una nota rápida..."
              className="w-full min-h-[80px] resize-none rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  saveNote()
                }
              }}
            />
            <p className="text-[10px] text-muted-foreground/40 mt-1">
              ⌘+Enter para guardar · Se guarda automáticamente en tu navegador
            </p>
          </div>
        </div>

        {/* Right column: Upcoming + Agenda */}
        <div className="space-y-6">
          {/* Upcoming Tasks */}
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/30">
              <Clock className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Próximos</h2>
            </div>

            {upcomingTasks.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Clock className="mx-auto h-6 w-6 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No hay tareas próximas</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {upcomingTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-gold-light transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.due_date && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(parseISO(task.due_date), 'EEE d MMM', { locale: es })}
                          </span>
                        )}
                        {task.projects?.name && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: task.projects.color || '#c9a961' }}
                            />
                            {task.projects.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  </Link>
                ))}
              </div>
            )}

            <Link
              href="/dashboard/tasks"
              className="flex items-center justify-center gap-1 border-t border-border/30 px-5 py-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors"
            >
              Ver todas las tareas
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Agenda Widget */}
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-4 w-4 text-rose-400" />
              <h2 className="text-sm font-semibold text-foreground">Agenda</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {agendaDays.map((day, idx) => {
                const isToday = idx === 0
                const dayStr = format(day, 'yyyy-MM-dd')
                const hasTasks = todayTasks.some((t) => t.due_date === dayStr) ||
                  upcomingTasks.some((t) => t.due_date === dayStr)

                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center rounded-lg py-2.5 px-1 transition-all ${
                      isToday
                        ? 'bg-gold/10 border border-gold/20'
                        : 'hover:bg-accent/30 border border-transparent'
                    }`}
                  >
                    <span className={`text-[10px] font-medium mb-1 ${
                      isToday ? 'text-gold-light' : 'text-muted-foreground'
                    }`}>
                      {formatDayName(day)}
                    </span>
                    <span className={`text-sm font-bold ${
                      isToday ? 'text-foreground' : 'text-foreground/80'
                    }`}>
                      {formatDayNumber(day)}
                    </span>
                    {hasTasks && (
                      <div className="flex gap-0.5 mt-1.5">
                        <div className={`h-1 w-1 rounded-full ${
                          isToday ? 'bg-gold-light' : 'bg-muted-foreground/40'
                        }`} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <Link
              href="/dashboard/calendar"
              className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border/30 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver calendario completo
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
