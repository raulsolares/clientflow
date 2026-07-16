'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  CheckCircle2, Clock, PhoneCall, Mail, Calendar,
  MessageSquare, FileText, User, Plus, ChevronDown,
  ChevronRight, Star, StarOff, FolderKanban, Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ActivityItem {
  id: string
  type: 'task_completed' | 'action_pending' | 'note' | 'event' | 'task_created'
  title: string
  description?: string
  date: string
  icon: any
  color: string
  link?: string
}

export default function ActivityFeed({ clientId }: { clientId: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadActivity()
  }, [clientId])

  async function loadActivity() {
    const supabase = createClient()
    const items: ActivityItem[] = []

    // 1. Completed tasks (last 10)
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id, title, status, completed_at, created_at, project_id')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10)

    if (completedTasks) {
      for (const t of completedTasks) {
        items.push({
          id: `task-${t.id}`,
          type: 'task_completed',
          title: t.title,
          description: 'Tarea completada',
          date: t.completed_at || t.created_at,
          icon: CheckCircle2,
          color: 'text-emerald-400',
          link: t.project_id ? `/dashboard/tasks/${t.id}` : undefined,
        })
      }
    }

    // 2. Pending actions (scheduled or recent)
    const { data: actions } = await supabase
      .from('client_actions')
      .select('id, title, action_type, scheduled_date, created_at, completed_at')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: false })
      .limit(10)

    if (actions) {
      for (const a of actions) {
        if (!a.completed_at) {
          items.push({
            id: `action-${a.id}`,
            type: 'action_pending',
            title: a.title,
            description: a.scheduled_date
              ? `Programado: ${new Date(a.scheduled_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
              : 'Sin fecha',
            date: a.scheduled_date || a.created_at,
            icon: a.action_type === 'call' ? PhoneCall : a.action_type === 'email' ? Mail : a.action_type === 'meeting' ? Calendar : Clock,
            color: a.scheduled_date && new Date(a.scheduled_date) < new Date() ? 'text-red-400' : 'text-amber-400',
          })
        }
      }
    }

    // 3. Recent notes (last 5)
    const { data: notes } = await supabase
      .from('client_notes')
      .select('id, content, created_at')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (notes) {
      for (const n of notes) {
        items.push({
          id: `note-${n.id}`,
          type: 'note',
          title: 'Nota registrada',
          description: n.content.length > 100 ? n.content.substring(0, 100) + '...' : n.content,
          date: n.created_at,
          icon: MessageSquare,
          color: 'text-blue-400',
        })
      }
    }

    // 4. Recent tasks (created, not completed)
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, title, status, created_at, project_id')
      .eq('client_id', clientId)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentTasks) {
      for (const t of recentTasks) {
        items.push({
          id: `task-new-${t.id}`,
          type: 'task_created',
          title: t.title,
          description: `Estado: ${t.status === 'pending' ? 'Pendiente' : t.status === 'in_progress' ? 'En progreso' : t.status === 'in_review' ? 'Revisión' : t.status}`,
          date: t.created_at,
          icon: FileText,
          color: t.status === 'in_progress' ? 'text-blue-400' : 'text-muted-foreground',
          link: t.project_id ? `/dashboard/tasks/${t.id}` : undefined,
        })
      }
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setActivities(items)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gold-light" />
      </div>
    )
  }

  const displayItems = showAll ? activities : activities.slice(0, 8)

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Completadas</span>
          </div>
          <p className="text-xl font-bold text-foreground mt-1">
            {activities.filter(a => a.type === 'task_completed').length}
          </p>
        </div>
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Pendientes</span>
          </div>
          <p className="text-xl font-bold text-foreground mt-1">
            {activities.filter(a => a.type === 'action_pending').length}
          </p>
        </div>
      </div>

      {/* Activity list */}
      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Actividad reciente
        </h3>

        {displayItems.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-0">
            {displayItems.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-accent/50 shrink-0 mt-0.5 ${item.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.link ? (
                      <Link href={item.link} className="font-medium text-sm text-foreground hover:text-gold-light transition-colors line-clamp-1">
                        {item.title}
                      </Link>
                    ) : (
                      <p className="font-medium text-sm text-foreground line-clamp-1">{item.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {new Date(item.date).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${
                    item.type === 'task_completed' ? 'border-emerald-500/20 text-emerald-400' :
                    item.type === 'action_pending' ? 'border-amber-500/20 text-amber-400' :
                    item.type === 'note' ? 'border-blue-500/20 text-blue-400' :
                    'border-border/50 text-muted-foreground'
                  }`}>
                    {item.type === 'task_completed' ? 'Hecho' :
                     item.type === 'action_pending' ? 'Acción' :
                     item.type === 'note' ? 'Nota' :
                     item.type === 'task_created' ? 'Tarea' : ''}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}

        {activities.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold-light transition-colors mt-2 px-2"
          >
            {showAll ? (
              <><ChevronDown className="h-3 w-3" /> Mostrar menos</>
            ) : (
              <><ChevronRight className="h-3 w-3" /> Ver {activities.length - 8} actividades más</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
