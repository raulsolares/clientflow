'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Bell, BellOff, CheckCircle2, AlertCircle, Calendar, UserPlus, MessageSquare, TrendingUp, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NotificationPreferences {
  new_task_assigned: boolean
  task_completed: boolean
  task_due_soon: boolean
  project_invite: boolean
  comment_added: boolean
  weekly_digest: boolean
}

interface PreferenceItem {
  key: keyof NotificationPreferences
  label: string
  description: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

const preferenceItems: PreferenceItem[] = [
  {
    key: 'new_task_assigned',
    label: 'Tarea asignada',
    description: 'Cuando te asignen una nueva tarea',
    icon: AlertCircle,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    key: 'task_completed',
    label: 'Tarea completada',
    description: 'Cuando una tarea asignada a ti sea completada',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  {
    key: 'task_due_soon',
    label: 'Vencimiento próximo',
    description: 'Recordatorio cuando una tarea esté por vencer',
    icon: Calendar,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  {
    key: 'project_invite',
    label: 'Invitación a proyecto',
    description: 'Cuando te inviten a un nuevo proyecto',
    icon: UserPlus,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
  {
    key: 'comment_added',
    label: 'Comentario añadido',
    description: 'Cuando alguien comente en tus tareas o proyectos',
    icon: MessageSquare,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
  },
  {
    key: 'weekly_digest',
    label: 'Resumen semanal',
    description: 'Recibe un resumen semanal de tu actividad (solo email)',
    icon: TrendingUp,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
  },
]

export default function NotificationsSettingsPage() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    new_task_assigned: true,
    task_completed: true,
    task_due_soon: true,
    project_invite: true,
    comment_added: true,
    weekly_digest: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      try {
        const res = await fetch('/api/notification-preferences')
        if (res.ok) {
          const data = await res.json()
          if (data.preferences) {
            setPreferences({
              new_task_assigned: data.preferences.new_task_assigned ?? true,
              task_completed: data.preferences.task_completed ?? true,
              task_due_soon: data.preferences.task_due_soon ?? true,
              project_invite: data.preferences.project_invite ?? true,
              comment_added: data.preferences.comment_added ?? true,
              weekly_digest: data.preferences.weekly_digest ?? false,
            })
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const savePreferences = async () => {
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
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
      <div>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gold-light" />
          <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configura qué notificaciones quieres recibir
        </p>
      </div>

      {/* Preferences */}
      <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
        <div className="divide-y divide-border/30">
          {preferenceItems.map((item) => {
            const Icon = item.icon
            const isEnabled = preferences[item.key]

            return (
              <div
                key={item.key}
                className="flex items-center justify-between px-5 py-4 gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`shrink-0 rounded-lg p-2.5 ${item.iconBg}`}>
                    <Icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => togglePreference(item.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold/30 focus:ring-offset-2 focus:ring-offset-background ${
                    isEnabled ? 'bg-lime-light' : 'bg-muted'
                  }`}
                  role="switch"
                  aria-checked={isEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-border/50 bg-card/30 p-4">
        <div className="flex items-start gap-3">
          <BellOff className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground">¿Qué son las notificaciones?</p>
            <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">
              Las notificaciones te mantienen informado sobre la actividad relevante en tus proyectos y tareas.
              Puedes personalizar cada tipo de notificación según tus preferencias. Los cambios se aplican
              inmediatamente después de guardar.
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Preferencias guardadas
          </span>
        )}
        <Button
          onClick={savePreferences}
          disabled={saving}
          className="min-w-[140px]"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}
