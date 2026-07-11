'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

export type Theme = 'cyber' | 'zero' | 'precise' | 'pulse' | 'flux' | 'nova' | 'edge'

export const THEMES: { value: Theme; label: string; description: string }[] = [
  { value: 'cyber', label: 'CYBER', description: 'Neon DeFi — dark cosmic con acentos neón' },
  { value: 'flux', label: 'FLUX', description: 'Lime refinado — dark profundo con verde lima' },
  { value: 'precise', label: 'PRECISE', description: 'Linear — oscuro, preciso, acento púrpura' },
  { value: 'nova', label: 'NOVA', description: 'Tech bold — oscuro con acento naranja' },
  { value: 'zero', label: 'ZERO', description: 'Minimal — blanco y negro, ultra-minimal' },
  { value: 'pulse', label: 'PULSE', description: 'Stripe — claro, profesional, acento azul' },
  { value: 'edge', label: 'EDGE', description: 'Ultra-sharp — monochrome, cero bordes redondeados' },
]

const THEME_KEY = 'clientflow-theme'

// Must match exactly the Theme type values
const ALL_THEMES = ['cyber', 'zero', 'precise', 'pulse', 'flux', 'nova', 'edge'] as const

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'cyber',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('cyber')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null
    if (saved && ALL_THEMES.includes(saved as any)) {
      setThemeState(saved as Theme)
      document.documentElement.setAttribute('data-theme', saved)
    } else {
      document.documentElement.setAttribute('data-theme', 'cyber')
    }
    setMounted(true)
  }, [])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_KEY, newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'cyber'
  const saved = localStorage.getItem(THEME_KEY) as Theme | null
  if (saved && ALL_THEMES.includes(saved as any)) return saved
  return 'cyber'
}
