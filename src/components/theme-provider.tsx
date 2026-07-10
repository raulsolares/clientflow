'use client'

import { ThemeProvider as LibThemeProvider } from '@/lib/theme'
import type { ReactNode } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <LibThemeProvider>{children}</LibThemeProvider>
}
