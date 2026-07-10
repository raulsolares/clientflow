'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  CalendarDays,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  User,
  FolderKanban,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CalendarTask {
  id: string
  title: string
  status: string
  priority: string
  due_date: string
  assigned_to: string | null
  project_id: string | null
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

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function getWeekDays(date: Date) {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function formatDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(d, today)) return 'Hoy'
  if (isSameDay(d, tomorrow)) return 'Mañana'
  if (isSameDay(d, yesterday)) return 'Ayer'

  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function isOverdue(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  return due < today
}

function isToday(dateStr: string) {
  return isSameDay(new Date(dateStr + 'T00:00:00'), new Date())
}

export default function CalendarPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<CalendarTask[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'list'>('month')

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  useEffect(() => {
    async function load() {
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

      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          id, title, status, priority, due_date, assigned_to, project_id,
          projects!inner(name, color),
          assignee:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .eq('company_id', profile.company_id)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: false })

      if (tasksData) setTasks(tasksData as unknown as CalendarTask[])
      setLoading(false)
    }
    load()
  }, [router])

  // Group tasks by due_date
  const groupedTasks: Record<string, CalendarTask[]> = {}
  tasks.forEach((task) => {
    const key = task.due_date
    if (!groupedTasks[key]) groupedTasks[key] = []
    groupedTasks[key].push(task)
  })

  const dateKeys = Object.keys(groupedTasks).sort()

  // Calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startPad = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startPad; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i)

  function taskCountForDate(day: number): number {
    const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return groupedTasks[key]?.length || 0
  }

  function tasksForDate(day: number): CalendarTask[] {
    const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return groupedTasks[key] || []
  }

  const today = new Date()

  function prevMonth() {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  function goToday() {
    setCurrentDate(new Date())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} con fecha de vencimiento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'month' ? 'list' : 'month')}
            className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-gold/30 transition-all"
          >
            {view === 'month' ? 'Vista lista' : 'Vista mes'}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-16 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Sin tareas con fecha</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Las tareas con fecha de vencimiento aparecerán aquí en el calendario.
          </p>
        </div>
      )}

      {/* Month View */}
      {view === 'month' && tasks.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
          {/* Calendar header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToday}
                className="rounded-lg border border-border/50 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-gold/30 transition-all"
              >
                Hoy
              </button>
              <button
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {monthNames[currentMonth]} {currentYear}
            </h2>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 border-b border-border/20">
            {dayNames.map((name) => (
              <div
                key={name}
                className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const isToday = day !== null && isSameDay(
                new Date(currentYear, currentMonth, day),
                today
              )
              const count = day !== null ? taskCountForDate(day) : 0

              return (
                <div
                  key={idx}
                  className={`min-h-[90px] border-b border-r border-border/20 p-1.5 transition-colors ${
                    day === null
                      ? 'bg-card/10'
                      : 'hover:bg-accent/20 cursor-pointer'
                  }`}
                >
                  {day !== null && (
                    <>
                      <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${
                        isToday
                          ? 'bg-gold text-primary-foreground font-bold'
                          : 'text-muted-foreground'
                      }`}>
                        {day}
                      </div>
                      {count > 0 && (
                        <div className="mt-1 space-y-0.5">
                          <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            isToday ? 'text-gold-light' : 'text-muted-foreground'
                          }`}>
                            {count} tarea{count !== 1 ? 's' : ''}
                          </div>
                          {tasksForDate(day).slice(0, 3).map((task) => (
                            <Link
                              key={task.id}
                              href={`/dashboard/tasks/${task.id}`}
                              className={`block text-[10px] truncate rounded px-1 py-0.5 transition-colors hover:opacity-80 ${
                                task.status === 'completed'
                                  ? 'bg-emerald-500/15 text-emerald-400 line-through'
                                  : isOverdue(task.due_date)
                                  ? 'bg-red-500/15 text-red-400'
                                  : 'bg-gold/10 text-gold-light'
                              }`}
                              title={task.title}
                            >
                              {task.title}
                            </Link>
                          ))}
                          {count > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1">
                              +{count - 3} más
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && tasks.length > 0 && (
        <div className="space-y-6">
          {dateKeys.map((dateKey) => {
            const dateTasks = groupedTasks[dateKey]
            const overdue = isOverdue(dateKey)
            const todayFlag = isToday(dateKey)

            return (
              <div key={dateKey}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-3">
                  {todayFlag ? (
                    <div className="flex items-center gap-2 rounded-lg bg-gold/10 px-3 py-1.5">
                      <CalendarIcon className="h-4 w-4 text-gold-light" />
                      <span className="text-sm font-semibold text-gold-light">Hoy</span>
                    </div>
                  ) : overdue ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-semibold text-red-400">
                        {formatDisplayDate(dateKey)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground capitalize">
                        {formatDisplayDate(dateKey)}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {dateTasks.length} tarea{dateTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Tasks */}
                <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                  <div className="divide-y divide-border/30">
                    {dateTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/dashboard/tasks/${task.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors group"
                      >
                        {/* Priority dot */}
                        <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[task.priority] || 'bg-gray-400'}`} />

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium truncate ${
                              task.status === 'completed'
                                ? 'line-through text-muted-foreground'
                                : 'text-foreground'
                            }`}>
                              {task.title}
                            </span>
                          </div>
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
                          </div>
                        </div>

                        {/* Status */}
                        <Badge className={`shrink-0 text-[10px] px-2 py-0.5 border hidden sm:inline-flex ${statusConfig[task.status]?.color || ''}`}>
                          {statusConfig[task.status]?.label || task.status}
                        </Badge>

                        {/* Overdue indicator */}
                        {overdue && task.status !== 'completed' && (
                          <span className="flex items-center gap-1 text-[10px] text-red-400 shrink-0">
                            <AlertCircle className="h-3 w-3" />
                            Vencida
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {tasks.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/20 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="text-xs text-muted-foreground">Vencida</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-xs text-muted-foreground">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span className="text-xs text-muted-foreground">En progreso</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-muted-foreground">Completada</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
