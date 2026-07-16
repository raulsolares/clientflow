'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  PhoneCall, Plus, CheckCircle2, Clock, User,
  Mail, Calendar, FileText, Loader2, ChevronDown, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Action {
  id: string
  action_type: string
  title: string
  description: string | null
  outcome: string | null
  scheduled_date: string | null
  completed_at: string | null
  assigned_to: string | null
  created_by: string | null
  linked_task_id: string | null
  created_at: string
  assignee?: { full_name: string | null } | null
  creator?: { full_name: string | null } | null
}

const actionIcons: Record<string, any> = {
  call: PhoneCall,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task_completed: CheckCircle2,
}

const actionLabels: Record<string, string> = {
  call: 'Llamada',
  email: 'Correo',
  meeting: 'Reunión',
  note: 'Nota',
  task_completed: 'Tarea completada',
  other: 'Otro',
}

export default function CrmActionsSection({ clientId }: { clientId: string }) {
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    action_type: 'call',
    title: '',
    description: '',
    outcome: '',
    scheduled_date: '',
  })
  const [adding, setAdding] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [completedActions, setCompletedActions] = useState<Action[]>([])

  useEffect(() => {
    loadActions()
  }, [clientId])

  async function loadActions() {
    const supabase = createClient()

    const { data: pending } = await supabase
      .from('client_actions')
      .select('*, assignee:assigned_to(full_name), creator:created_by(full_name)')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .is('completed_at', null)
      .order('scheduled_date', { ascending: true })
    if (pending) setActions(pending as Action[])

    const { data: completed } = await supabase
      .from('client_actions')
      .select('*, assignee:assigned_to(full_name), creator:created_by(full_name)')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10)
    if (completed) setCompletedActions(completed as Action[])

    setLoading(false)
  }

  async function addAction() {
    if (!formData.title.trim()) return
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('client_actions').insert({
      client_id: clientId,
      action_type: formData.action_type,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      outcome: formData.outcome.trim() || null,
      scheduled_date: formData.scheduled_date || null,
      created_by: user?.id || null,
    })

    setFormData({ action_type: 'call', title: '', description: '', outcome: '', scheduled_date: '' })
    setShowForm(false)
    setAdding(false)
    loadActions()
  }

  async function completeAction(actionId: string) {
    const supabase = createClient()
    await supabase.from('client_actions').update({
      completed_at: new Date().toISOString(),
      outcome: 'Completada',
    }).eq('id', actionId)
    loadActions()
  }

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gold-light" /></div>
  }

  const ActionIcon = (type: string) => {
    const Icon = actionIcons[type] || FileText
    return Icon
  }

  return (
    <div className="space-y-3">
      {/* Add action button */}
      {!showForm ? (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Registrar acción
        </Button>
      ) : (
        <div className="p-3 rounded-lg border border-gold/20 bg-gold/5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={formData.action_type}
              onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
              className="h-9 rounded-lg border border-border/50 bg-card px-2 text-sm"
            >
              <option value="call">📞 Llamada</option>
              <option value="email">📧 Correo</option>
              <option value="meeting">📅 Reunión</option>
              <option value="note">📝 Nota</option>
              <option value="other">🔧 Otro</option>
            </select>
            <Input
              type="datetime-local"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="h-9 text-xs"
            />
          </div>
          <Input
            placeholder="Título de la acción..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <textarea
            placeholder="Notas o descripción..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="flex min-h-[60px] w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-all placeholder:text-muted-foreground resize-y"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="default" className="lime-glow" size="sm" onClick={addAction} disabled={!formData.title.trim() || adding}>
              {adding ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}

      {/* Pending actions */}
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">Sin acciones pendientes</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {actions.map(action => {
            const Icon = ActionIcon(action.action_type)
            return (
              <div key={action.id} className="p-3 rounded-lg border border-border/30 bg-accent/5 text-sm hover:border-border/50 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 text-gold-light shrink-0" />
                    <span className="font-medium text-foreground truncate">{action.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs">{actionLabels[action.action_type] || action.action_type}</Badge>
                    <button
                      onClick={() => completeAction(action.id)}
                      className="p-1 rounded text-muted-foreground hover:text-emerald-400 transition-colors"
                      title="Marcar completada"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {action.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{action.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {action.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(action.scheduled_date).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  )}
                  {action.assignee && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {action.assignee.full_name}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed actions toggle */}
      {completedActions.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCompleted ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {completedActions.length} completadas
          </button>
          {showCompleted && (
            <div className="space-y-1 mt-2 max-h-40 overflow-y-auto">
              {completedActions.map(action => (
                <div key={action.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1.5 px-2 rounded hover:bg-accent/10">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{action.title}</span>
                  <span className="ml-auto shrink-0">
                    {new Date(action.completed_at!).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
