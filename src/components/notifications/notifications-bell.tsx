'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  metadata: Record<string, unknown> | null
  is_read: boolean
  created_at: string
  company_id: string | null
  link: string | null
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      const list: Notification[] = data.notifications ?? []
      setNotifications(list.slice(0, 5))
      setUnreadCount(list.filter((n) => !n.is_read).length)
    } catch {
      // Silently fail — the user doesn't need to see fetch errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000) // every 30s
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      if (!res.ok) return
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      // Close the dropdown after marking as read
      setOpen(false)
    } catch {
      // ignore
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
    // More than a day — use date-fns with Spanish locale
    return format(date, "d 'de' MMM", { locale: es })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-lime-light px-1 text-[10px] font-bold text-lime-foreground shadow-sm shadow-lime/20">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
          Notificaciones
        </div>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground/60">Sin notificaciones</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                'flex flex-col items-start gap-1 px-3 py-3',
                !notification.is_read && 'bg-accent/30'
              )}
              onSelect={(e) => {
                e.preventDefault()
                // If there's a link and notification is unread, mark as read first
                if (!notification.is_read) {
                  markAsRead(notification.id)
                }
              }}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span
                  className={cn(
                    'text-sm font-medium leading-tight',
                    !notification.is_read && 'text-foreground'
                  )}
                >
                  {notification.title}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground/60">
                  {formatTimestamp(notification.created_at)}
                </span>
              </div>
              {notification.body && (
                <p className="text-xs text-muted-foreground/80 line-clamp-2">
                  {notification.body}
                </p>
              )}
              {!notification.is_read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    markAsRead(notification.id)
                  }}
                  className="mt-1 self-start rounded-md px-2 py-0.5 text-[11px] font-medium text-lime-light transition-colors hover:bg-accent"
                >
                  Marcar como leída
                </button>
              )}
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex cursor-pointer items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-foreground"
          onSelect={(e) => {
            e.preventDefault()
            window.location.href = '/dashboard/notificaciones'
          }}
        >
          Ver todas
          <span className="text-muted-foreground/60">→</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
