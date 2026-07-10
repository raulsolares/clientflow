'use client'

import { useTheme, THEMES, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { Check, Palette } from 'lucide-react'

const themePreviewGradients: Record<Theme, string> = {
  cyber: 'from-[#0a0e1a] via-[#1a2233] to-[#0a0e1a]',
  zero: 'from-[#fafafa] via-[#ffffff] to-[#f5f5f5]',
  precise: 'from-[#08090a] via-[#0b0c0e] to-[#131418]',
  pulse: 'from-[#f8faff] via-[#ffffff] to-[#f3f6fc]',
}

const themeAccentColors: Record<Theme, string> = {
  cyber: 'bg-[#a3f748]',
  zero: 'bg-[#171717]',
  precise: 'bg-[#5e6ad2]',
  pulse: 'bg-[#533afd]',
}

const themeAccentText: Record<Theme, string> = {
  cyber: 'text-[#a3f748]',
  zero: 'text-[#171717]',
  precise: 'text-[#5e6ad2]',
  pulse: 'text-[#533afd]',
}

const themeBgAccent: Record<Theme, string> = {
  cyber: 'bg-[#a3f748]/10',
  zero: 'bg-[#171717]/5',
  precise: 'bg-[#5e6ad2]/10',
  pulse: 'bg-[#533afd]/6',
}

const themeTagline: Record<Theme, string> = {
  cyber: 'Dashboard con 12 proyectos activos',
  zero: 'Dashboard con 12 proyectos activos',
  precise: 'Dashboard con 12 proyectos activos',
  pulse: 'Dashboard con 12 proyectos activos',
}

export default function AppearancePage() {
  const { theme: currentTheme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Apariencia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personaliza el aspecto visual del dashboard. Elige entre 4 temas premium.
        </p>
      </div>

      {/* Theme grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {THEMES.map((t) => {
          const isActive = currentTheme === t.value
          return (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'group relative overflow-hidden rounded-xl border p-0 text-left transition-all duration-300',
                isActive
                  ? 'border-primary/60 ring-2 ring-primary/20 shadow-lg shadow-primary/5'
                  : 'border-border/50 hover:border-border hover:shadow-md hover:-translate-y-0.5'
              )}
            >
              {/* Preview area */}
              <div
                className={cn(
                  'flex h-32 items-end justify-between rounded-t-xl px-4 pb-3 pt-4',
                  'bg-gradient-to-br',
                  themePreviewGradients[t.value]
                )}
              >
                {/* Mini chart bars */}
                <div className="flex items-end gap-1.5">
                  {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
                    <div
                      key={i}
                      className="w-2.5 rounded-t-sm opacity-70"
                      style={{
                        height: `${h}%`,
                        backgroundColor:
                          t.value === 'cyber'
                            ? '#a3f748'
                            : t.value === 'zero'
                            ? '#171717'
                            : t.value === 'precise'
                            ? '#5e6ad2'
                            : '#533afd',
                        opacity: 0.4 + h / 200,
                      }}
                    />
                  ))}
                </div>
                {/* Swatch circles */}
                <div className="flex -space-x-1.5">
                  <div
                    className={cn(
                      'h-7 w-7 rounded-full border-2 border-white/20',
                      themeAccentColors[t.value]
                    )}
                  />
                  <div className="h-7 w-7 rounded-full border-2 border-white/20 bg-white/10" />
                  <div className="h-7 w-7 rounded-full border-2 border-white/20 bg-white/30" />
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-wide text-foreground">
                    {t.label}
                  </span>
                  {isActive && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.description}
                </p>
                {/* Accent color preview */}
                <div className="flex items-center gap-2 pt-1">
                  <span className={cn('inline-block h-3 w-3 rounded-full', themeAccentColors[t.value])} />
                  <span className={cn('text-xs font-medium', themeAccentText[t.value])}>
                    Acento
                  </span>
                  <div className="ml-auto flex gap-1">
                    {['bg-foreground', themeAccentColors[t.value], 'bg-muted'].map((bg, i) => (
                      <span
                        key={i}
                        className={cn('inline-block h-2.5 w-5 rounded-sm', bg)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Theme info */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          El tema se guarda automáticamente en tu navegador y persistirá entre sesiones.
          También puedes cambiar el tema desde el menú rápido en el header del dashboard.
        </p>
      </div>
    </div>
  )
}
