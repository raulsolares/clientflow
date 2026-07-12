'use client'

import { X, Lock, Check, ArrowRight, Zap, Crown } from 'lucide-react'
import Link from 'next/link'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  resource: string // 'projects' | 'clients' | 'members'
  currentPlan: string
}

const resourceLabels: Record<string, string> = {
  projects: 'proyectos',
  clients: 'clientes',
  members: 'miembros del equipo',
}

const planComparison: Record<string, { current: string; pro: string }[]> = {
  projects: [
    { current: '5 proyectos', pro: '100 proyectos' },
    { current: '3 miembros', pro: '50 miembros' },
    { current: '10 clientes', pro: '500 clientes' },
    { current: '—', pro: 'Soporte prioritario' },
  ],
  clients: [
    { current: '10 clientes', pro: '500 clientes' },
    { current: '5 proyectos', pro: '100 proyectos' },
    { current: '3 miembros', pro: '50 miembros' },
    { current: '—', pro: 'Portal del cliente avanzado' },
  ],
  members: [
    { current: '3 miembros', pro: '50 miembros' },
    { current: '5 proyectos', pro: '100 proyectos' },
    { current: '10 clientes', pro: '500 clientes' },
    { current: '—', pro: 'Roles personalizados' },
  ],
}

export function UpgradeModal({ open, onClose, resource, currentPlan }: UpgradeModalProps) {
  if (!open) return null

  const label = resourceLabels[resource] || resource
  const comparison = planComparison[resource] || planComparison.projects

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20">
            <Lock className="h-6 w-6 text-amber-400" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-5">
          <h2 className="text-lg font-bold text-foreground">
            Límite alcanzado
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Has alcanzado el límite de <span className="font-medium text-foreground">{label}</span> en tu plan actual ({currentPlan}).
            Actualiza para seguir creciendo.
          </p>
        </div>

        {/* Comparison mini table */}
        <div className="rounded-xl border border-border/40 bg-accent/10 overflow-hidden mb-5">
          <div className="grid grid-cols-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 border-b border-border/30">
            <div className="px-4 py-2.5">Función</div>
            <div className="px-3 py-2.5 text-center">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                {currentPlan}
              </span>
            </div>
            <div className="px-3 py-2.5 text-center">
              <span className="inline-flex items-center gap-1 text-gold-light">
                <Crown className="h-3 w-3" />
                Pro
              </span>
            </div>
          </div>
          {comparison.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-3 text-sm ${i < comparison.length - 1 ? 'border-b border-border/20' : ''}`}
            >
              <div className="px-4 py-2.5 text-muted-foreground text-xs">
                {row.current.split(' ').slice(1).join(' ') || row.current}
              </div>
              <div className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                {row.current.split(' ')[0]}
              </div>
              <div className="px-3 py-2.5 text-center text-xs text-gold-light font-medium">
                {row.pro.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/pricing?upgrade=true"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 hover:scale-[1.02] hover:brightness-110 transition-all duration-200 shadow-sm"
            onClick={onClose}
          >
            <Zap className="h-4 w-4" />
            Ver planes y actualizar
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={onClose}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            No gracias, ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
