'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Trash2, Calendar, User, Clock, FolderKanban,
  MessageSquare, Plus, Send, Timer, Clock3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

function formatTime(hours: number | null, unit: string | null): string {
  if (hours === null || hours === undefined) return '—'
  if (unit === 'minutes') return `${hours.toFixed(0)} min`
  if (unit === 'days') return `${hours.toFixed(1)} días`
  return `${hours.toFixed(1)}h`
}

function parseTimeInput(value: string, unit: string): number {
  const num = parseFloat(value)
  if (isNaN(num) || num < 0) return 0
  if (unit === 'minutes') return num
  if (unit === 'days') return num * 8 // 1 day = 8 hours
  return num // hours
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
  const [myId, setMyId] = useState<string | null>(null)
  const [profileMap, setProfileMap] = useState<Record<string, string>>({})

  // Time tracking state
  const [logTimeValue, setLogTimeValue] = useState('')
  const [logTimeUnit, setLogTimeUnit] = useState('hours')
  const [loggingTime, setLoggingTime] = useState(false)
  const [totalTimeSpent, setTotalTimeSpent] = useState(0)
  const [timeLogs, setTimeLogs] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

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

      // Load comments with profiles
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

      // Load time tracking data
      await loadTimeTracking(supabase, taskData.id)

      setLoading(false)
    }
    load()
  }, [params.id, router])

  async function loadTimeTracking(supabase: any, taskId: string) {
    // Try to get time_logs if the table exists
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

  async function deleteTask() {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', params.id)
    router.push('/dashboard/tasks')
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

    const hours = parseTimeInput(logTimeValue, logTimeUnit)
    if (hours <= 0) { setLoggingTime(false); return }

    const supabase = createClient()
    const displayValue = parseFloat(logTimeValue)

    // Try to insert into time_logs table
    const { error: logError } = await supabase.from('time_logs').insert({
      task_id: task.id,
      user_id: myId,
      hours: hours,
      description: `${displayValue} ${logTimeUnit}`,
    })

    if (!logError) {
      // Update the task's total time_spent
      const newTotal = (task.time_spent || 0) + hours
      await supabase.from('tasks').update({ time_spent: newTotal }).eq('id', task.id)
      setTask({ ...task, time_spent: newTotal })
      setTotalTimeSpent(prev => prev + hours)
    } else {
      // If time_logs table doesn't exist, just update the task column directly
      const newTotal = (task.time_spent || 0) + hours
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ time_spent: newTotal })
        .eq('id', task.id)

      if (!updateError) {
        setTask({ ...task, time_spent: newTotal })
        setTotalTimeSpent(newTotal)
      } else {
        console.error('Error logging time:', updateError)
      }
    }

    setLogTimeValue('')
    setLoggingTime(false)
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
      <Link
        href="/dashboard/tasks"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a tareas
      </Link>

      {/* Task header */}
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
        <Button variant="ghost" size="sm" onClick={deleteTask} className="text-muted-foreground hover:text-red-400 shrink-0 ml-4">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status selector */}
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

      {/* Time tracking section */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Seguimiento de tiempo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/30 bg-accent/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">Estimado</p>
              <p className="text-lg font-semibold text-foreground">
                {formatTime(timeEstimated, timeUnit)}
              </p>
            </div>
            <div className="rounded-lg border border-border/30 bg-accent/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">Registrado</p>
              <p className={`text-lg font-semibold ${
                timeSpent > timeEstimated && timeEstimated > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {formatTime(timeSpent, timeUnit)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {timeEstimated > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progreso</span>
                <span>{Math.min(100, Math.round((timeSpent / timeEstimated) * 100))}%</span>
              </div>
              <div className="h-2 rounded-full bg-accent/30 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    timeSpent > timeEstimated
                      ? 'bg-amber-500'
                      : timeSpent / timeEstimated > 0.75
                        ? 'bg-gold-light'
                        : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (timeSpent / timeEstimated) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Time logs */}
          {timeLogs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Registros</p>
              {timeLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground">{log.description || `${log.hours}h`}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Log time form */}
          <div className="flex items-end gap-2 pt-2 border-t border-border/30">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Registrar tiempo</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="Ej: 2.5"
                value={logTimeValue}
                onChange={(e) => setLogTimeValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogTime()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Unidad</label>
              <select
                className="h-10 rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground"
                value={logTimeUnit}
                onChange={(e) => setLogTimeUnit(e.target.value)}
              >
                <option value="hours">Horas</option>
                <option value="minutes">Minutos</option>
                <option value="days">Días</option>
              </select>
            </div>
            <Button
              onClick={handleLogTime}
              disabled={!logTimeValue.trim() || loggingTime}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
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
          {/* Comment input */}
          <div className="flex gap-2">
            <textarea
              className="flex min-h-[60px] flex-1 rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 placeholder:text-muted-foreground hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent resize-none"
              placeholder="Escribe un comentario... (Enter para enviar)"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  addComment()
                }
              }}
            />
            <Button onClick={addComment} disabled={!commentText.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Comment list */}
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin comentarios aún. Sé el primero en comentar.
            </p>
          )}

          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg p-3 ${
                  comment.author_id === myId
                    ? 'bg-gold/5 border border-gold/10'
                    : 'bg-accent/10 border border-border/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <span className="h-5 w-5 rounded-full bg-gold/20 flex items-center justify-center text-[9px] font-bold text-gold-light">
                      {(profileMap[comment.author_id] || 'U').charAt(0).toUpperCase()}
                    </span>
                    {profileMap[comment.author_id] || 'Usuario'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
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
