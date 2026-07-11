'use client'

import { useTheme, type Theme } from '@/lib/theme'
import { Palette } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const themeConfig: { value: Theme; label: string; swatch: string }[] = [
  { value: 'cyber', label: 'CYBER', swatch: 'from-[#0a0e1a] to-[#a3f748]' },
  { value: 'flux', label: 'FLUX', swatch: 'from-[#0b0f18] to-[#a3f748]' },
  { value: 'precise', label: 'PRECISE', swatch: 'from-[#08090a] to-[#5e6ad2]' },
  { value: 'nova', label: 'NOVA', swatch: 'from-[#050e14] to-[#e65523]' },
  { value: 'zero', label: 'ZERO', swatch: 'from-[#ffffff] to-[#171717]' },
  { value: 'pulse', label: 'PULSE', swatch: 'from-[#ffffff] to-[#533afd]' },
  { value: 'edge', label: 'EDGE', swatch: 'from-[#0d0d0d] to-[#ffffff]' },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground">
          <Palette className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themeConfig.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              'flex items-center gap-3 cursor-pointer',
              theme === t.value && 'bg-accent/50 font-medium'
            )}
          >
            <span
              className={cn(
                'h-5 w-5 shrink-0 rounded-md border border-border',
                'bg-gradient-to-br',
                t.swatch
              )}
            />
            <span className="flex-1 text-sm">{t.label}</span>
            {theme === t.value && (
              <span className="text-xs text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
