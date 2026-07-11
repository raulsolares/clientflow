import { Sidebar } from "@/components/layout/sidebar"
import { UserNav } from "@/components/layout/user-nav"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { NotificationsBell } from "@/components/notifications/notifications-bell"
import { Search } from "lucide-react"
import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-4 lg:px-6">
          <div className="flex items-center gap-2 pl-10 lg:pl-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard" className="transition-colors hover:text-foreground">
                Inicio
              </Link>
              <span className="text-border">/</span>
              <span className="text-foreground">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground">
              <Search className="h-4 w-4" />
            </button>
            <NotificationsBell />
            <ThemeSwitcher />
            <UserNav />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
