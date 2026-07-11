"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar } from "@/components/ui/avatar"
import {
  User,
  Settings,
  LogOut,
  HelpCircle,
  Keyboard,
} from "lucide-react"
import { HelpModal } from "@/components/help-modal"

export function UserNav() {
  const router = useRouter()
  const [userName, setUserName] = React.useState("Usuario")
  const [userEmail, setUserEmail] = React.useState("")
  const [showHelp, setShowHelp] = React.useState(false)
  const [showShortcuts, setShowShortcuts] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUserName(profile.full_name || user.email?.split('@')[0] || 'Usuario')
          setUserEmail(profile.email || user.email || '')
        } else {
          setUserName(user.email?.split('@')[0] || 'Usuario')
          setUserEmail(user.email || '')
        }
      }
    }
    load()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground outline-none">
            <Avatar size="sm" fallback={userName} />
            <span className="hidden md:inline-flex truncate max-w-[120px]">{userName}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-foreground truncate">{userName}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Perfil
                <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowHelp(true)}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Ayuda
            <DropdownMenuShortcut>⌘H</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowShortcuts(true)}>
            <Keyboard className="mr-2 h-4 w-4" />
            Atajos de teclado
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-muted-foreground hover:text-red-400 focus:text-red-400">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
            <DropdownMenuShortcut>⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <HelpModal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        showShortcuts={showShortcuts}
        onShortcutsClose={() => setShowShortcuts(false)}
      />
    </>
  )
}
