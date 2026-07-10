"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare2,
  Columns3,
  CalendarDays,
  Users,
  FileText,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Briefcase,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: "Principal",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Proyectos", href: "/dashboard/projects", icon: FolderKanban },
      { label: "Tareas", href: "/dashboard/tasks", icon: CheckSquare2 },
      { label: "Kanban", href: "/dashboard/tasks/kanban", icon: Columns3 },
      { label: "Calendario", href: "/dashboard/calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Gestión",
    items: [
      { label: "Clientes", href: "/dashboard/clients", icon: Users },
      { label: "Archivos", href: "/dashboard/files", icon: FileText },
      { label: "Equipo", href: "/dashboard/team", icon: UserCog },
    ],
  },
]

const bottomItems: NavItem[] = [
  { label: "Configuración", href: "/dashboard/settings", icon: Settings },
  { label: "Cerrar sesión", href: "/logout", icon: LogOut },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border/50 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold-dark shadow-sm">
          <Briefcase className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          Client<span className="text-gold-light">Flow</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {section.title}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "hover:bg-sidebar-hover hover:text-foreground",
                    isActive(item.href)
                      ? "bg-sidebar-active-bg text-gold-light shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "h-4 w-4 shrink-0 transition-all duration-200",
                    isActive(item.href) ? "text-gold-light" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span>{item.label}</span>
                  {isActive(item.href) && (
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-gold-light/60" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Separator */}
        <div className="my-4 border-t border-border/50" />

        {/* Bottom items */}
        <div className="space-y-0.5">
          {bottomItems.map((item) => {
            const isLogout = item.href === "/logout"
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  "hover:bg-sidebar-hover",
                  isLogout
                    ? "text-muted-foreground hover:text-red-400"
                    : isActive(item.href)
                    ? "bg-sidebar-active-bg text-gold-light shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4 shrink-0 transition-all duration-200",
                  isLogout
                    ? "group-hover:text-red-400"
                    : isActive(item.href)
                    ? "text-gold-light"
                    : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User avatar at bottom */}
      <div className="border-t border-border/50 px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-hover">
          <Avatar size="sm" fallback="Admin" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Admin User</span>
            <span className="text-xs text-muted-foreground">admin@clientflow.com</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed left-4 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-card/90 backdrop-blur-sm text-foreground shadow-sm lg:hidden"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 -translate-x-full transform border-r border-border/50 bg-sidebar-bg shadow-2xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:translate-x-0",
          isMobileOpen && "translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
