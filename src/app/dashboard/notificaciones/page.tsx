'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Bell,
  BellOff,
  CheckCheck,
  Filter,
  ArrowLeft,
  Loader2,
  Inbox,
  CheckCircle2,
  AlertCircle,
  Calendar,
  UserPlus,
  MessageSquare,
  TrendingUp,
  LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
  company_id: string | null
}

type FilterType = 'all' | 'unread' | 'task_assigned' | 'task_completed' | 'task_due_soon' | 'project_invite' | 'comment_added'

const typeIcons: Record<string, LucideIcon> = {
  task_assigned: AlertCircle,
  task_completed: CheckCircle2,
  task_due_soon: Calendar,
  project_invite: UserPlus,
  comment_added: MessageSquare,
  weekly_digest: TrendingUp,
}

const typeColors: Record<string, string> = {
  task_assigned: 'bg-blue-500/10 text-blue-400',
  task_completed: 'bg-emerald-500/10 text-emerald-400',
  task_due_soon: 'bg-amber-500/10 text-amber-400',
  project_invite: 'bg-violet-500/10 text-violet-400',
  comment_added: 'bg-rose-500/10 text-rose-400',
  weekly_digest: 'bg-cyan-500/10 text-cyan-400',
}

const typeLabels: Record<string, string> = {
  task_assigned: 'Tarea asignada',
  task_completed: 'Tarea completada',
  task_due_soon: 'Vencimiento próximo',
  project_invite: 'Invitación',
  comment_added: 'Comentario',
  weekly_digest: 'Resumen semanal',
}

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'No leídas' },
  { value: 'task_assigned', label: 'Tareas asignadas' },
  { value: 'task_completed', label: 'Tareas completadas' },
  { value: 'task_due_soon', label: 'Vencimiento próximo' },
  { value: 'project_invite', label: 'Invitaciones' },
  { value: 'comment_added', label: 'Comentarios' },
]

export default function NotificacionesPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      if (!res.ok) return
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
    } catch {
      // ignore
    }
  }

  const markAllAsRead = async () => {
    setMarkingAll(true)
    const unreadIds = filteredNotifications
      .filter((n) => !n.is_read)
      .map((n) => n.id)

    if (unreadIds.length === 0) {
      setMarkingAll(false)
      return
    }

    try {
      await Promise.all(
        unreadIds.map((id) =>
          fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: id }),
          })
        )
      )
      setNotifications((prev) =>
        prev.map((n) =>
          unreadIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      )
    } catch {
      // ignore
    } finally {
      setMarkingAll(false)
    }
  }

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60_000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins} min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Hace ${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    return format(date, "d 'de' MMM", { locale: es })
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'unread') return !n.is_read
    return n.type === activeFilter
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const hasUnread = filteredNotifications.some((n) => !n.is_read)

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gold-light" />
            <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-lime-light px-2 py-0.5 text-[11px] font-bold text-lime-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Mantente al día con todas tus notificaciones
          </p>
        </div>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={markingAll}
            className="shrink-0"
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeFilter === opt.value
                ? 'bg-gold/15 text-gold-light border border-gold/20 shadow-sm'
                : 'bg-card/50 text-muted-foreground border border-border/50 hover:bg-card hover:text-foreground'
            }`}
          >
            {opt.value === 'unread' && <Filter className="h-3 w-3" />}
            {opt.label}
            {opt.value === 'all' && (
              <span className="ml-0.5 text-[10px] opacity-60">({notifications.length})</span>
            )}
            {opt.value === 'unread' && unreadCount > 0 && (
              <span className="ml-0.5 text-[10px] opacity-60">({unreadCount})</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-border/50 bg-card/30">
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            {activeFilter === 'all' ? (
              <BellOff className="h-10 w-10 text-muted-foreground/40" />
            ) : (
              <Inbox className="h-10 w-10 text-muted-foreground/40" />
            )}
          </div>
          <p className="text-sm font-medium text-foreground">
            {activeFilter === 'all'
              ? 'No tienes notificaciones aún'
              : activeFilter === 'unread'
              ? 'No tienes notificaciones sin leer'
              : `No hay notificaciones de tipo "${typeLabels[activeFilter] || activeFilter}"`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeFilter === 'all'
              ? 'Las notificaciones aparecerán aquí cuando tengas actividad'
              : 'Prueba cambiando el filtro'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
          <div className="divide-y divide-border/30">
            {filteredNotifications.map((notification) => {
              const TypeIcon = typeIcons[notification.type] || Bell
              const typeColor = typeColors[notification.type] || 'bg-muted/50 text-muted-foreground'
              const typeLabel = typeLabels[notification.type] || notification.type

              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                    !notification.is_read ? 'bg-accent/20' : 'hover:bg-accent/10'
                  }`}
                >
                  {/* Type icon */}
                  <div className={`shrink-0 rounded-lg p-2.5 ${typeColor}`}>
                    <TypeIcon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-medium leading-tight ${
                            !notification.is_read ? 'text-foreground' : 'text-foreground/80'
                          }`}
                        >
                          {notification.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded">
                          {typeLabel}
                        </span>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground/60 whitespace-nowrap">
                        {formatTimestamp(notification.created_at)}
                      </span>
                    </div>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="text-[11px] font-medium text-gold-light hover:text-gold transition-colors"
                          onClick={() => {
                            if (!notification.is_read) {
                              markAsRead(notification.id)
                            }
                          }}
                        >
                          Ver detalles →
                        </Link>
                      )}
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Marcar como leída
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notification.is_read && (
                    <div className="shrink-0 mt-2">
                      <div className="h-2 w-2 rounded-full bg-lime-light" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
