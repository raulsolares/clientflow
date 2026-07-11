'use client'

import { useEffect, useState, useRef } from 'react'
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
  Plus,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/* ---------- types ---------- */
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

interface CalendarEventRow {
  id: string
  title: string
  description: string | null
  event_type: string
  start_date: string
  end_date: string | null
  all_day: boolean
  color: string | null
  task_id: string | null
  project_id: string | null
  projects?: { name: string; color: string } | null
}

interface ProjectDeadline {
  id: string
  name: string
  end_date: string
  color: string
}

type CalendarItem =
  | { kind: 'task'; data: CalendarTask }
  | { kind: 'event'; data: CalendarEventRow }
  | { kind: 'deadline'; data: ProjectDeadline }

type FilterMode = 'all' | 'tasks' | 'events' | 'deadlines' | 'meetings'

/* ---------- helpers ---------- */
const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  in_review: { label: 'Revisión', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  completed: { label: 'Completada', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function isOverdue(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  return due < today
}

function itemColor(item: CalendarItem): string {
  switch (item.kind) {
    case 'task':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    case 'event':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    case 'deadline':
      return 'bg-red-500/15 text-red-300 border-red-500/30'
  }
}

function itemLabel(item: CalendarItem): string {
  switch (item.kind) {
    case 'task': return 'Tarea'
    case 'event': return item.data.event_type === 'meeting' ? 'Reunión' : 'Evento'
    case 'deadline': return 'Entrega'
  }
}

/* ---------- component ---------- */
export default function CalendarPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<CalendarTask[]>([])
  const [events, setEvents] = useState<CalendarEventRow[]>([])
  const [deadlines, setDeadlines] = useState<ProjectDeadline[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filter, setFilter] = useState<FilterMode>('all')

  // Hover tooltip state - with delay to allow clicking
  const [hoveredItem, setHoveredItem] = useState<{ item: CalendarItem; rect: DOMRect } | null>(null)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showTooltip(item: CalendarItem, rect: DOMRect) {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    setHoveredItem({ item, rect })
  }

  function hideTooltipDelayed(delay = 3000) {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    tooltipTimerRef.current = setTimeout(() => {
      setHoveredItem(null)
    }, delay)
  }

  function keepTooltip() {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
  }

  // Add event modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDesc, setNewEventDesc] = useState('')
  const [newEventType, setNewEventType] = useState<'event' | 'meeting'>('event')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventTime, setNewEventTime] = useState('')
  const [newEventColor, setNewEventColor] = useState('#10b981')
  const [savingEvent, setSavingEvent] = useState(false)

  // Calendar state
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const today = new Date()

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
      const cid = profile.company_id

      // Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          id, title, status, priority, due_date, assigned_to, project_id,
          projects!inner(name, color),
          assignee:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .eq('company_id', cid)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: false })

      if (tasksData) setTasks(tasksData as unknown as CalendarTask[])

      // Calendar events
      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select(`
          id, title, description, event_type, start_date, end_date, all_day, color,
          task_id, project_id,
          projects(name, color)
        `)
        .eq('company_id', cid)
        .order('start_date', { ascending: true })

      if (eventsData) setEvents(eventsData as unknown as CalendarEventRow[])

      // Project deadlines (projects with end_date in the future or this month)
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, end_date, color')
        .eq('company_id', cid)
        .not('end_date', 'is', null)
        .neq('status', 'completed')
        .order('end_date', { ascending: true })

      if (projectsData) setDeadlines(projectsData as ProjectDeadline[])

      setLoading(false)
    }
    load()
  }, [router])

  /* ---- derive items ---- */
  const allItems: CalendarItem[] = [
    ...tasks.map(t => ({ kind: 'task' as const, data: t })),
    ...events.map(e => ({ kind: 'event' as const, data: e })),
    ...deadlines.map(d => ({ kind: 'deadline' as const, data: d })),
  ]

  /* ---- helpers ---- */
  function itemDateKey(item: CalendarItem): string {
    switch (item.kind) {
      case 'task': return item.data.due_date
      case 'event': return item.data.start_date.substring(0, 10)
      case 'deadline': return item.data.end_date
    }
  }

  function itemTitle(item: CalendarItem): string {
    switch (item.kind) {
      case 'task': return item.data.title
      case 'event': return item.data.title
      case 'deadline': return item.data.name
    }
  }

  function itemHref(item: CalendarItem): string {
    switch (item.kind) {
      case 'task': return `/dashboard/tasks/${item.data.id}`
      case 'event': return '#'
      case 'deadline': return `/dashboard/projects/${item.data.id}`
    }
  }

  function passesFilter(item: CalendarItem): boolean {
    if (filter === 'all') return true
    if (filter === 'tasks') return item.kind === 'task'
    if (filter === 'events') return item.kind === 'event' && item.data.event_type === 'event'
    if (filter === 'deadlines') return item.kind === 'deadline'
    if (filter === 'meetings') return item.kind === 'event' && item.data.event_type === 'meeting'
    return true
  }

  /* ---- group items by date ---- */
  const groupedByDate: Record<string, CalendarItem[]> = {}
  allItems.forEach(item => {
    if (!passesFilter(item)) return
    const key = itemDateKey(item)
    if (!groupedByDate[key]) groupedByDate[key] = []
    groupedByDate[key].push(item)
  })
  const dateKeys = Object.keys(groupedByDate).sort()

  /* ---- calendar grid ---- */
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startPad = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startPad; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i)

  function itemsForDate(day: number): CalendarItem[] {
    const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return groupedByDate[key] || []
  }

  function prevMonth() { setCurrentDate(new Date(currentYear, currentMonth - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(currentYear, currentMonth + 1, 1)) }
  function goToday() { setCurrentDate(new Date()) }

  /* ---- add event ---- */
  async function handleAddEvent() {
    if (!newEventTitle.trim() || !newEventDate) return
    setSavingEvent(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) return

      const startDateTime = newEventTime
        ? `${newEventDate}T${newEventTime}:00`
        : `${newEventDate}T00:00:00`

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          company_id: profile.company_id,
          title: newEventTitle.trim(),
          description: newEventDesc.trim() || null,
          event_type: newEventType,
          start_date: startDateTime,
          all_day: !newEventTime,
          color: newEventColor,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating event:', error)
        alert('Error al crear evento: ' + error.message)
      } else if (data) {
        setEvents(prev => [...prev, data as unknown as CalendarEventRow])
        setShowAddModal(false)
        resetEventForm()
      }
    } catch (err) {
      console.error(err)
    }
    setSavingEvent(false)
  }

  function resetEventForm() {
    setNewEventTitle('')
    setNewEventDesc('')
    setNewEventType('event')
    setNewEventDate('')
    setNewEventTime('')
    setNewEventColor('#10b981')
  }

  /* ---- tooltip component ---- */
  function Tooltip({ item, rect }: { item: CalendarItem; rect: DOMRect }) {
    const tooltipRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ top: 0, left: 0 })

    useEffect(() => {
      if (!tooltipRef.current) return
      const tip = tooltipRef.current
      const w = tip.offsetWidth
      const h = tip.offsetHeight
      const pad = 12

      let top = rect.top - h - pad
      let left = rect.left + rect.width / 2 - w / 2

      // Keep within viewport
      if (top < 8) top = rect.bottom + pad
      if (left < 8) left = 8
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8

      setPos({ top, left })
    }, [rect])

    const linkHref = itemHref(item)
    const projectName = item.kind === 'task'
      ? (item.data as any).projects?.name
      : item.kind === 'event'
        ? (item.data as any).projects?.name
        : null

    const timeStr = item.kind === 'event'
      ? item.data.start_date
        ? new Date(item.data.start_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : ''
      : item.kind === 'task' && item.data.due_date
        ? item.data.due_date
        : ''

    return (
      <div
        ref={tooltipRef}
        className="fixed z-[100] rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl p-3 shadow-2xl min-w-[200px] max-w-[280px]"
        style={{ top: pos.top, left: pos.left }}
        onMouseEnter={keepTooltip}
        onMouseLeave={() => hideTooltipDelayed(1000)}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`w-2 h-2 rounded-full ${itemColor(item).split(' ')[0]}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {itemLabel(item)}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">{itemTitle(item)}</p>
        {timeStr && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeStr}
          </p>
        )}
        {projectName && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <FolderKanban className="h-3 w-3" />
            {projectName}
          </p>
        )}
        {linkHref !== '#' && (
          <Link
            href={linkHref}
            className="mt-2 inline-flex items-center gap-1 text-xs text-gold-light hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            Ver detalle
          </Link>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    )
  }

  const totalItems = allItems.filter(passesFilter).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalItems} elemento{totalItems !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => {
            resetEventForm()
            setNewEventDate(new Date().toISOString().substring(0, 10))
            setShowAddModal(true)
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar evento
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'tasks', 'events', 'deadlines', 'meetings'] as FilterMode[]).map((mode) => {
          const labels: Record<FilterMode, string> = {
            all: 'Todo',
            tasks: 'Tareas',
            events: 'Eventos',
            deadlines: 'Entregas',
            meetings: 'Reuniones',
          }
          return (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === mode
                  ? 'bg-gold/20 text-gold-light border border-gold/30'
                  : 'text-muted-foreground border border-border/50 hover:text-foreground hover:border-border/80'
              }`}
            >
              {labels[mode]}
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {totalItems === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-16 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Sin elementos</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            No hay tareas, eventos o proyectos con fecha en este período.
          </p>
        </div>
      )}

      {/* Month View */}
      {totalItems > 0 && (
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
              const todayFlag = day !== null && isSameDay(
                new Date(currentYear, currentMonth, day),
                today
              )
              const dayItems = day !== null ? itemsForDate(day) : []
              const count = dayItems.length

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r border-border/20 p-1.5 transition-colors ${
                    day === null
                      ? 'bg-card/10'
                      : 'hover:bg-accent/20'
                  }`}
                >
                  {day !== null && (
                    <>
                      <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium mb-1 ${
                        todayFlag
                          ? 'bg-gold text-primary-foreground font-bold'
                          : 'text-muted-foreground'
                      }`}>
                        {day}
                      </div>
                      {count > 0 && (
                        <div className="space-y-0.5">
                          {dayItems.slice(0, 3).map((item, i) => {
                            const href = itemHref(item)
                            const isTaskCompleted = item.kind === 'task' && item.data.status === 'completed'

                            return (
                              <div key={`${item.kind}-${i}`} className="relative">
                                {href !== '#' ? (
                                  <Link
                                    href={href}
                                    className={`block text-[10px] truncate rounded px-1 py-0.5 transition-colors hover:opacity-80 border ${itemColor(item)} ${
                                      isTaskCompleted ? 'line-through opacity-60' : ''
                                    }`}
                                    title={itemTitle(item)}
                                    onMouseEnter={(e) => {
                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                      showTooltip(item, rect)
                                    }}
                                    onMouseLeave={() => hideTooltipDelayed(3000)}
                                  >
                                    {itemTitle(item)}
                                  </Link>
                                ) : (
                                  <span
                                    className={`block text-[10px] truncate rounded px-1 py-0.5 border ${itemColor(item)}`}
                                    title={itemTitle(item)}
                                    onMouseEnter={(e) => {
                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                      showTooltip(item, rect)
                                    }}
                                    onMouseLeave={() => hideTooltipDelayed(3000)}
                                  >
                                    {itemTitle(item)}
                                  </span>
                                )}
                              </div>
                            )
                          })}
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

      {/* Hover tooltip */}
      {hoveredItem && (
        <Tooltip item={hoveredItem.item} rect={hoveredItem.rect} />
      )}

      {/* Legend */}
      <div className="rounded-xl border border-border/50 bg-card/20 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-400" />
            <span className="text-xs text-muted-foreground">Tareas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
            <span className="text-xs text-muted-foreground">Eventos</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-purple-400" />
            <span className="text-xs text-muted-foreground">Reuniones</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
            <span className="text-xs text-muted-foreground">Entregas</span>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Agregar evento</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Título *</label>
                <Input
                  placeholder="Título del evento"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent resize-none"
                  placeholder="Descripción (opcional)"
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewEventType('event')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                      newEventType === 'event'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'border-border/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Evento
                  </button>
                  <button
                    onClick={() => setNewEventType('meeting')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                      newEventType === 'meeting'
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : 'border-border/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Reunión
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha *</label>
                <Input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                />
              </div>

              {/* Time */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Hora (opcional)</label>
                <Input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
                <div className="flex gap-2">
                  {['#10b981', '#8b5cf6', '#f59e0b', '#3b82f6', '#ef4444', '#06b6d4'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewEventColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        newEventColor === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddEvent}
                  disabled={!newEventTitle.trim() || !newEventDate || savingEvent}
                >
                  {savingEvent ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  {savingEvent ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
