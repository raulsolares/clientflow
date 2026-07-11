'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Trash2, Calendar, User, Clock, FolderKanban,
  MessageSquare, Plus, Send, Timer, Clock3, Edit3, Save, X, Loader2, Archive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  estimated_hours: number | null
  time_estimated: number | null
  time_spent: number | null
  time_unit: string | null
  assigned_to: string | null
  project_id: string | null
  visible_to_client: boolean
  created_at: string
  archived_at: string | null
}

interface Project {
  id: string
  name: string
  color: string
}

interface Comment {
  id: string
  content: string
  author_id: string
  created_at: string
}

interface Profile {
  id: string
  full_name: string | null
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  review: { label: 'Revisión', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  completed: { label: 'Completada', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const priorityConfig: Record<string, { label: string; dot: string }> = {
  low: { label: 'Baja', dot: 'bg-gray-400' },
  medium: { label: 'Media', dot: 'bg-gold-light' },
  high: { label: 'Alta', dot: 'bg-orange-400' },
  urgent: { label: 'Urgente', dot: 'bg-red-400' },
}

function hoursToHHMM(hours: number): string {
  if (!hours && hours !== 0) return '0:00'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

function hhmmToHours(hhmm: string): number {
  const trimmed = hhmm.trim()
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    if (isNaN(h) || isNaN(m)) return 0
    return h + m / 60
  }
  // Fallback to decimal number for backward compatibility
  const num = parseFloat(trimmed)
  return isNaN(num) || num < 0 ? 0 : num
}

function formatTime(hours: number | null, _unit?: string | null): string {
  if (hours === null || hours === undefined) return '—'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [assignee, setAssignee] = useState<Profile | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)
  const [profileMap, setProfileMap] = useState<Record<string, string>>({})
  const [companyMembers, setCompanyMembers] = useState<Profile[]>([])

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
    estimated_hours: '',
  })

  // Time tracking state
  const [logTimeValue, setLogTimeValue] = useState('')
  const [loggingTime, setLoggingTime] = useState(false)
  const [totalTimeSpent, setTotalTimeSpent] = useState(0)
  const [timeLogs, setTimeLogs] = useState<any[]>([])

  // Time log editing state
  const [editingTimeLogId, setEditingTimeLogId] = useState<string | null>(null)
  const [editTimeLogValue, setEditTimeLogValue] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!taskData) { router.push('/dashboard/tasks'); return }
      setTask(taskData)

      // Load project
      if (taskData.project_id) {
        const { data: p } = await supabase.from('projects').select('id, name, color').eq('id', taskData.project_id).single()
        if (p) setProject(p)
      }

      // Load assignee
      if (taskData.assigned_to) {
        const { data: a } = await supabase.from('profiles').select('id, full_name').eq('id', taskData.assigned_to).single()
        if (a) setAssignee(a)
      }

      // Load company members for assignee selector
      if (profile?.company_id) {
        const { data: members } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('company_id', profile.company_id)
          .order('full_name')
        if (members) setCompanyMembers(members)
      }

      // Load comments
      const { data: commentsData } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', params.id)
        .order('created_at', { ascending: true })

      if (commentsData) {
        setComments(commentsData)
        const authorIds = [...new Set(commentsData.map(c => c.author_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', authorIds)
        if (profiles) {
          const map: Record<string, string> = {}
          profiles.forEach(p => { map[p.id] = p.full_name || 'Usuario' })
          setProfileMap(map)
        }
      }

      // Load time tracking
      await loadTimeTracking(supabase, taskData.id)

      // Init edit form
      setEditForm({
        title: taskData.title,
        description: taskData.description || '',
        priority: taskData.priority,
        assigned_to: taskData.assigned_to || '',
        due_date: taskData.due_date ? taskData.due_date.substring(0, 10) : '',
        estimated_hours: (taskData.time_estimated || taskData.estimated_hours || 0) > 0
          ? hoursToHHMM(taskData.time_estimated || taskData.estimated_hours || 0) : '',
      })

      setLoading(false)
    }
    load()
  }, [params.id, router])

  async function loadTimeTracking(supabase: any, taskId: string) {
    const { data: logs } = await supabase
      .from('time_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (logs) {
      setTimeLogs(logs)
      const total = logs.reduce((sum: number, log: any) => sum + (log.hours || 0), 0)
      setTotalTimeSpent(total)
    }
  }

  async function updateStatus(newStatus: string) {
    if (!task) return
    const supabase = createClient()
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTask({ ...task, status: newStatus })
  }

  async function saveTask() {
    if (!task || !editForm.title.trim()) return
    setSaving(true)
    const supabase = createClient()

    const estimatedHours = editForm.estimated_hours ? hhmmToHours(editForm.estimated_hours) : null

    const { error } = await supabase.from('tasks').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      priority: editForm.priority,
      assigned_to: editForm.assigned_to || null,
      due_date: editForm.due_date || null,
      time_estimated: estimatedHours,
      estimated_hours: estimatedHours,
    }).eq('id', task.id)

    if (error) {
      alert('Error al guardar: ' + error.message)
      setSaving(false)
      return
    }

    // Reload assignee display
    if (editForm.assigned_to) {
      const { data: a } = await supabase.from('profiles').select('id, full_name').eq('id', editForm.assigned_to).single()
      if (a) setAssignee(a)
    } else {
      setAssignee(null)
    }

    setTask({
      ...task,
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      priority: editForm.priority,
      assigned_to: editForm.assigned_to || null,
      due_date: editForm.due_date || null,
      time_estimated: estimatedHours,
      estimated_hours: estimatedHours,
    })

    setEditing(false)
    setSaving(false)
  }

  function startEditing() {
    if (!task) return
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assigned_to: task.assigned_to || '',
      due_date: task.due_date ? task.due_date.substring(0, 10) : '',
      estimated_hours: (task.time_estimated || task.estimated_hours || 0) > 0
        ? hoursToHHMM(task.time_estimated || task.estimated_hours || 0) : '',
    })
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
  }

  async function deleteTask() {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', params.id)
    router.push('/dashboard/tasks')
  }

  async function archiveTask() {
    if (!task) return
    const willArchive = !task.archived_at
    if (willArchive && !confirm('¿Archivar esta tarea? Se ocultará de la lista principal.')) return
    if (!willArchive && !confirm('¿Restaurar esta tarea?')) return
    const supabase = createClient()
    await supabase.from('tasks').update({ archived_at: willArchive ? new Date().toISOString() : null }).eq('id', task.id)
    setTask({ ...task, archived_at: willArchive ? new Date().toISOString() : null })
  }

  async function addComment() {
    if (!commentText.trim() || !task || !myId) return
    const supabase = createClient()
    const { data } = await supabase.from('task_comments').insert({
      task_id: task.id,
      author_id: myId,
      content: commentText.trim(),
    }).select().single()

    if (data) {
      setComments(prev => [...prev, data])
      setCommentText('')
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', myId).single()
      if (profile) {
        setProfileMap(prev => ({ ...prev, [myId!]: profile.full_name || 'Usuario' }))
      }
    }
  }

  async function handleLogTime() {
    if (!task || !logTimeValue.trim() || !myId) return
    setLoggingTime(true)
    const hours = hhmmToHours(logTimeValue.trim())
    if (hours <= 0) { setLoggingTime(false); return }

    const supabase = createClient()

    const { error: logError } = await supabase.from('time_logs').insert({
      task_id: task.id,
      user_id: myId,
      hours: hours,
      description: hoursToHHMM(hours),
    })

    if (!logError) {
      const newTotal = (task.time_spent || 0) + hours
      await supabase.from('tasks').update({ time_spent: newTotal }).eq('id', task.id)
      setTask({ ...task, time_spent: newTotal })
      setTotalTimeSpent(prev => prev + hours)
      // Reload to include the new entry
      await loadTimeTracking(supabase, task.id)
    } else {
      // Try to update anyway
      const newTotal = (task.time_spent || 0) + hours
      await supabase.from('tasks').update({ time_spent: newTotal }).eq('id', task.id)
      setTask({ ...task, time_spent: newTotal })
      setTotalTimeSpent(newTotal)
    }

    setLogTimeValue('')
    setLoggingTime(false)
  }

  // Time log editing functions
  function startEditTimeLog(log: any) {
    setEditingTimeLogId(log.id)
    setEditTimeLogValue(hoursToHHMM(log.hours))
  }

  async function saveEditTimeLog() {
    if (!editingTimeLogId || !task || !editTimeLogValue.trim()) return
    const supabase = createClient()
    const hours = hhmmToHours(editTimeLogValue.trim())
    if (hours <= 0) return

    const log = timeLogs.find(l => l.id === editingTimeLogId)
    if (!log) return

    const diff = hours - (log.hours || 0)

    const { error } = await supabase
      .from('time_logs')
      .update({ hours, description: hoursToHHMM(hours) })
      .eq('id', editingTimeLogId)

    if (!error) {
      const newTotal = (task.time_spent || 0) + diff
      await supabase.from('tasks').update({ time_spent: newTotal }).eq('id', task.id)
      setTask({ ...task, time_spent: newTotal })
      setTotalTimeSpent(prev => prev + diff)
      await loadTimeTracking(supabase, task.id)
    }

    setEditingTimeLogId(null)
    setEditTimeLogValue('')
  }

  function cancelEditTimeLog() {
    setEditingTimeLogId(null)
    setEditTimeLogValue('')
  }

  async function deleteTimeLog(logId: string) {
    if (!task || !confirm('¿Eliminar este registro de tiempo?')) return
    const supabase = createClient()
    const log = timeLogs.find(l => l.id === logId)
    if (!log) return

    const { error } = await supabase.from('time_logs').delete().eq('id', logId)
    if (!error) {
      const newTotal = Math.max(0, (task.time_spent || 0) - (log.hours || 0))
      await supabase.from('tasks').update({ time_spent: newTotal }).eq('id', task.id)
      setTask({ ...task, time_spent: newTotal })
      setTotalTimeSpent(newTotal)
      await loadTimeTracking(supabase, task.id)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  )

  if (!task) return null

  const timeEstimated = task.time_estimated || task.estimated_hours || 0
  const timeSpent = task.time_spent || totalTimeSpent || 0
  const timeUnit = task.time_unit || 'hours'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a tareas
        </Link>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button size="sm" className="lime-glow" onClick={saveTask} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={startEditing} className="text-muted-foreground">
                <Edit3 className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={archiveTask} className={`text-muted-foreground ${task.archived_at ? 'text-amber-400' : 'hover:text-amber-400'}`} title={task.archived_at ? 'Restaurar' : 'Archivar'}>
                <Archive className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={deleteTask} className="text-muted-foreground hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Task header - editable or display */}
      {editing ? (
        <Card glass>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Título *</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Título de la tarea"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Descripción</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground transition-all placeholder:text-muted-foreground hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe la tarea..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Prioridad</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground"
                  value={editForm.priority}
                  onChange={(e) => setEditForm(f => ({ ...f, priority: e.target.value }))}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Asignada a</label>
                <SearchableSelect
                  options={companyMembers.map(m => ({ value: m.id, label: m.full_name || 'Sin nombre' }))}
                  value={editForm.assigned_to}
                  onChange={(val) => setEditForm(f => ({ ...f, assigned_to: val }))}
                  placeholder="Sin asignar"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Fecha de entrega</label>
                <Input
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Tiempo estimado (HH:MM)</label>
                <Input
                  type="text"
                  placeholder="Ej: 1:30"
                  value={editForm.estimated_hours}
                  onChange={(e) => setEditForm(f => ({ ...f, estimated_hours: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Display header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`h-2.5 w-2.5 rounded-full ${priorityConfig[task.priority]?.dot || 'bg-gray-400'}`} />
                <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{task.description}</p>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground"
              value={task.status}
              onChange={(e) => updateStatus(e.target.value)}
            >
              <option value="pending">Pendiente</option>
              <option value="in_progress">En progreso</option>
              <option value="review">Revisión</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <Badge className={`border ${statusConfig[task.status]?.color || ''}`}>
              {statusConfig[task.status]?.label || task.status}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              {priorityConfig[task.priority]?.label || task.priority}
            </span>
            {project && (
              <Link href={`/dashboard/projects/${project.id}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-accent/40 rounded-full px-2.5 py-1 hover:bg-accent/60 transition-colors">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color || '#c9a961' }} />
                {project.name}
              </Link>
            )}
            {task.visible_to_client && (
              <span className="text-xs text-gold-light">Visible para el cliente</span>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card glass>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="h-3.5 w-3.5" />
                  Asignada a
                </div>
                <p className="text-sm font-medium text-foreground">
                  {assignee?.full_name || 'Sin asignar'}
                </p>
              </CardContent>
            </Card>
            <Card glass>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Fecha de entrega
                </div>
                <p className="text-sm font-medium text-foreground">
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Sin fecha'}
                </p>
              </CardContent>
            </Card>
            <Card glass>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Tiempo estimado
                </div>
                <p className="text-sm font-medium text-foreground">
                  {timeEstimated > 0 ? formatTime(timeEstimated, timeUnit) : 'Sin estimar'}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Time tracking section */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Seguimiento de tiempo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/30 bg-accent/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">Estimado</p>
              <p className="text-lg font-semibold text-foreground">{formatTime(timeEstimated, timeUnit)}</p>
            </div>
            <div className="rounded-lg border border-border/30 bg-accent/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">Registrado</p>
              <p className={`text-lg font-semibold ${timeSpent > timeEstimated && timeEstimated > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatTime(timeSpent, timeUnit)}
              </p>
            </div>
          </div>
          {timeEstimated > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progreso</span>
                <span>{Math.min(100, Math.round((timeSpent / timeEstimated) * 100))}%</span>
              </div>
              <div className="h-2 rounded-full bg-accent/30 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    timeSpent > timeEstimated ? 'bg-amber-500' : timeSpent / timeEstimated > 0.75 ? 'bg-gold-light' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (timeSpent / timeEstimated) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {timeLogs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Registros</p>
              {timeLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-sm">
                  {editingTimeLogId === log.id ? (
                    /* Inline edit mode */
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="text"
                        placeholder="HH:MM"
                        value={editTimeLogValue}
                        onChange={(e) => setEditTimeLogValue(e.target.value)}
                        className="h-8 w-24"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditTimeLog()
                          if (e.key === 'Escape') cancelEditTimeLog()
                        }}
                      />
                      <Button size="sm" variant="ghost" onClick={saveEditTimeLog} className="h-8 w-8 p-0">
                        <Save className="h-3.5 w-3.5 text-emerald-400" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEditTimeLog} className="h-8 w-8 p-0">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    /* Display mode */
                    <>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground font-medium">{hoursToHHMM(log.hours)}</span>
                        {log.description && (
                          <span className="text-muted-foreground">· {formatTime(log.hours)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </span>
                        <button
                          onClick={() => startEditTimeLog(log)}
                          className="text-muted-foreground hover:text-gold-light transition-colors p-1"
                          title="Editar tiempo"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteTimeLog(log.id)}
                          className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                          title="Eliminar registro"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 pt-2 border-t border-border/30">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Registrar tiempo (HH:MM)</label>
              <Input
                type="text"
                placeholder="Ej: 1:30"
                value={logTimeValue}
                onChange={(e) => setLogTimeValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogTime()}
              />
            </div>
            <Button onClick={handleLogTime} disabled={!logTimeValue.trim() || loggingTime} className="shrink-0">
              {loggingTime ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comentarios
            <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <textarea
              className="flex min-h-[60px] flex-1 rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground transition-all placeholder:text-muted-foreground hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Escribe un comentario... (Enter para enviar)"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() }
              }}
            />
            <Button onClick={addComment} disabled={!commentText.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin comentarios aún. Sé el primero en comentar.
            </p>
          )}
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className={`rounded-lg p-3 ${comment.author_id === myId ? 'bg-gold/5 border border-gold/10' : 'bg-accent/10 border border-border/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <span className="h-5 w-5 rounded-full bg-gold/20 flex items-center justify-center text-[9px] font-bold text-gold-light">
                      {(profileMap[comment.author_id] || 'U').charAt(0).toUpperCase()}
                    </span>
                    {profileMap[comment.author_id] || 'Usuario'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
