'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

export type Theme = 'cyber' | 'zero' | 'precise' | 'pulse'

export const THEMES: { value: Theme; label: string; description: string }[] = [
  { value: 'cyber', label: 'CYBER', description: 'Neon DeFi — dark cosmic con acentos neón' },
  { value: 'zero', label: 'ZERO', description: 'Minimal — limpio, blanco y negro, ultra-minimal' },
  { value: 'precise', label: 'PRECISE', description: 'Linear — oscuro, preciso, acento púrpura' },
  { value: 'pulse', label: 'PULSE', description: 'Stripe — claro, profesional, acento azul' },
]

const THEME_KEY = 'clientflow-theme'

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
    if (saved && ['cyber', 'zero', 'precise', 'pulse'].includes(saved)) {
      setThemeState(saved)
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
  if (saved && ['cyber', 'zero', 'precise', 'pulse'].includes(saved)) return saved
  return 'cyber'
}
