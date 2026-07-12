'use client'

import { useState } from 'react'
import {
  X,
  Rocket,
  FolderKanban,
  UserPlus,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface OnboardingModalProps {
  open: boolean
  onComplete: () => void
  companyName: string
}

export function OnboardingModal({ open, onComplete, companyName }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectColor, setProjectColor] = useState('#c9a961')
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [projectCreated, setProjectCreated] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  if (!open) return null

  const totalSteps = 3

  async function handleCreateProject() {
    if (!projectName.trim()) return
    setCreating(true)
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

      await supabase.from('projects').insert({
        name: projectName.trim(),
        description: projectDescription.trim() || null,
        color: projectColor,
        company_id: profile.company_id,
        created_by: user.id,
        status: 'planning',
        priority: 'medium',
      })

      setProjectCreated(true)
    } catch (err) {
      console.error('Error creating project:', err)
    } finally {
      setCreating(false)
    }
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
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

      await fetch('/api/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          company_id: profile.company_id,
          role: 'member',
        }),
      })

      setInviteSent(true)
    } catch (err) {
      console.error('Error sending invite:', err)
    } finally {
      setInviting(false)
    }
  }

  function handleNext() {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Progress bar */}
        <div className="h-1 bg-accent/30">
          <div
            className="h-full bg-gradient-to-r from-gold to-amber-400 transition-all duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Paso {step} de {totalSteps}
          </span>
          <button
            onClick={onComplete}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-2">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/20 to-amber-500/10 border border-gold/20">
                  <Rocket className="h-8 w-8 text-gold-light" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  ¡Bienvenido a ClientFlow!
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Hola, <span className="font-medium text-foreground">{companyName}</span>. 
                  Estamos encantados de tenerte. Completa estos pasos para configurar tu espacio de trabajo y empezar a gestionar tus proyectos.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-gold-light" />
                  <span>3 pasos rápidos</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="rounded-lg border border-border/30 bg-accent/10 p-3 text-center">
                  <FolderKanban className="h-5 w-5 text-blue-400 mx-auto mb-1.5" />
                  <p className="text-[11px] text-muted-foreground">Crea un proyecto</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-accent/10 p-3 text-center">
                  <UserPlus className="h-5 w-5 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-[11px] text-muted-foreground">Invita tu equipo</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-accent/10 p-3 text-center">
                  <Rocket className="h-5 w-5 text-violet-400 mx-auto mb-1.5" />
                  <p className="text-[11px] text-muted-foreground">¡A trabajar!</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Create first project */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <FolderKanban className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
                <h2 className="text-lg font-bold text-foreground">Crea tu primer proyecto</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Organiza tu trabajo en proyectos. Puedes crear más después.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Nombre del proyecto *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ej: Rediseño web cliente ABC"
                    className="w-full rounded-lg border border-border/50 bg-accent/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Descripción
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Breve descripción del proyecto..."
                    rows={2}
                    className="w-full rounded-lg border border-border/50 bg-accent/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/30 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    {['#c9a961', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setProjectColor(c)}
                        className={`h-7 w-7 rounded-full border-2 transition-all ${projectColor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {projectCreated ? (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-sm text-emerald-400 font-medium">
                  <Check className="h-4 w-4" />
                  ¡Proyecto creado!
                </div>
              ) : (
                <button
                  onClick={handleCreateProject}
                  disabled={!projectName.trim() || creating}
                  className="w-full rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-sm font-medium py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creando...' : 'Crear proyecto'}
                </button>
              )}
            </div>
          )}

          {/* Step 3: Invite team */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <UserPlus className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
                <h2 className="text-lg font-bold text-foreground">Invita a tu equipo</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Colabora con tu equipo invitándolos a tu espacio de trabajo.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Email del invitado
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colega@empresa.com"
                      className="flex-1 rounded-lg border border-border/50 bg-accent/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/30 transition-all"
                    />
                    <button
                      onClick={handleSendInvite}
                      disabled={!inviteEmail.trim() || inviting || inviteSent}
                      className="rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-3.5 py-2.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      ) : inviteSent ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {inviteSent && (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-sm text-emerald-400 font-medium">
                    <Check className="h-4 w-4" />
                    ¡Invitación enviada!
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground text-center">
                  Este paso es opcional. Puedes invitar miembros más tarde desde la sección Equipo.
                </p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:scale-[1.02] hover:brightness-110 transition-all shadow-sm"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:scale-[1.02] hover:brightness-110 transition-all shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                Finalizar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
