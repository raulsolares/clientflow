'use client'

import { X, BookOpen, Users, FolderKanban, CalendarDays, FileText, Bell, Palette, KeyRound, Shield, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface HelpModalProps {
  open: boolean
  onClose: () => void
  showShortcuts: boolean
  onShortcutsClose: () => void
}

export function HelpModal({ open, onClose, showShortcuts, onShortcutsClose }: HelpModalProps) {
  if (!open && !showShortcuts) return null

  if (showShortcuts) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onShortcutsClose}>
        <div
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <span className="text-sm font-bold">⌘</span>
              </span>
              Atajos de teclado
            </h2>
            <button onClick={onShortcutsClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {[
              { keys: '⌘P', action: 'Ir a Perfil' },
              { keys: '⌘S', action: 'Ir a Configuración' },
              { keys: '⌘H', action: 'Abrir Ayuda' },
              { keys: '⌘K', action: 'Atajos de teclado' },
              { keys: '⌘Q', action: 'Cerrar sesión' },
              { keys: '⌘B', action: 'Toggle sidebar' },
              { keys: '⌘N', action: 'Nuevo proyecto' },
              { keys: '⌘T', action: 'Nueva tarea' },
            ].map((shortcut) => (
              <div key={shortcut.keys} className="flex items-center justify-between rounded-lg bg-accent/20 px-4 py-2.5">
                <span className="text-sm text-foreground">{shortcut.action}</span>
                <kbd className="rounded-md border border-border bg-card px-2 py-1 text-xs font-mono text-muted-foreground shadow-sm">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime/20 to-cyan/20">
              <BookOpen className="h-5 w-5 text-lime-light" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Manual de ClientFlow</h2>
              <p className="text-xs text-muted-foreground">Versión 1.0 — by DistritoW</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Section: Dashboard */}
          <Section icon={<LayoutDashboardIcon />} title="Dashboard">
            <p>El Dashboard es tu centro de control. Aquí ves un resumen de:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Proyectos activos y su progreso</li>
              <li>Tareas pendientes y próximas a vencer</li>
              <li>Miembros del equipo</li>
              <li>Actividad reciente</li>
            </ul>
          </Section>

          {/* Section: Projects */}
          <Section icon={<FolderKanban className="h-5 w-5 text-blue-400" />} title="Proyectos">
            <p>Gestiona tus proyectos desde <Link href="/dashboard/projects" className="text-lime-light hover:underline">Proyectos</Link>.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Crear proyecto:</strong> Define nombre, descripción, cliente, fechas y color</li>
              <li><strong>Equipo:</strong> Agrega miembros con roles (Manager, Editor, Viewer)</li>
              <li><strong>Tareas:</strong> Crea tareas rápidas desde el proyecto o desde la sección Tareas</li>
              <li><strong>Archivos:</strong> Sube archivos (hasta 1MB) o agrega enlaces externos</li>
              <li><strong>Dashboard:</strong> Cada proyecto tiene métricas de progreso</li>
            </ul>
          </Section>

          {/* Section: Tasks */}
          <Section icon={<CheckSquareIcon />} title="Tareas">
            <p>Administra tus tareas desde <Link href="/dashboard/tasks" className="text-lime-light hover:underline">Tareas</Link> o vista <Link href="/dashboard/tasks/kanban" className="text-lime-light hover:underline">Kanban</Link>.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Estados:</strong> Pendiente → En progreso → Revisión → Completada</li>
              <li><strong>Asignación:</strong> Asigna a miembros del equipo</li>
              <li><strong>Fechas:</strong> Define fecha de entrega</li>
              <li><strong>Tiempo:</strong> Estima horas y registra tiempo trabajado</li>
              <li><strong>Comentarios:</strong> Discute la tarea con el equipo</li>
              <li><strong>Prioridades:</strong> Baja, Media, Alta, Urgente</li>
            </ul>
          </Section>

          {/* Section: Calendar */}
          <Section icon={<CalendarDays className="h-5 w-5 text-emerald-400" />} title="Calendario">
            <p>El <Link href="/dashboard/calendar" className="text-lime-light hover:underline">Calendario</Link> unifica:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Tareas con fecha de entrega</li>
              <li>Eventos y reuniones (creables desde el calendario)</li>
              <li>Entregas de proyectos</li>
              <li>Filtros por tipo (Tareas, Eventos, Reuniones, Entregas)</li>
              <li>Tooltip con detalle al hacer hover + link directo</li>
            </ul>
          </Section>

          {/* Section: Files */}
          <Section icon={<FileText className="h-5 w-5 text-amber-400" />} title="Archivos">
            <p>La sección <Link href="/dashboard/files" className="text-lime-light hover:underline">Archivos</Link> centraliza todos los documentos.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Subida directa:</strong> Hasta 1MB por archivo (PDF, Word, Excel, imágenes)</li>
              <li><strong>Enlaces externos:</strong> Para archivos grandes, agrega links a Drive, Dropbox, etc.</li>
              <li><strong>Vinculación:</strong> Asocia archivos a proyectos o clientes</li>
              <li>Filtros por proyecto, cliente y tipo</li>
            </ul>
          </Section>

          {/* Section: Team */}
          <Section icon={<Users className="h-5 w-5 text-violet-400" />} title="Equipo">
            <p>Administra tu <Link href="/dashboard/team" className="text-lime-light hover:underline">Equipo</Link>.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Roles:</strong> Admin (todo), Manager (gestión), Miembro (trabajo), Viewer (solo lectura)</li>
              <li><strong>Invitar:</strong> Solo admins pueden invitar. Se envía email con enlace</li>
              <li><strong>Gestión:</strong> Cambiar roles, eliminar miembros, revocar invitaciones</li>
            </ul>
          </Section>

          {/* Section: Notifications */}
          <Section icon={<Bell className="h-5 w-5 text-sky-400" />} title="Notificaciones">
            <p>Configura tus notificaciones desde <Link href="/dashboard/settings/notifications" className="text-lime-light hover:underline">Configuración de notificaciones</Link>.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Elige qué eventos quieres recibir (tareas, invitaciones, comentarios)</li>
              <li>Las notificaciones aparecen en el icono de campana en el header</li>
              <li>Puedes ver el historial completo en la sección de notificaciones</li>
            </ul>
          </Section>

          {/* Section: Themes */}
          <Section icon={<Palette className="h-5 w-5 text-pink-400" />} title="Temas">
            <p>ClientFlow incluye <Link href="/dashboard/settings/appearance" className="text-lime-light hover:underline">7 temas</Link> con personalización visual completa.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>CYBER:</strong> Neon DeFi dark con acentos lima/cian</li>
              <li><strong>FLUX:</strong> Lima refinado, más pulido y profundo</li>
              <li><strong>PRECISE:</strong> Linear-like con acento púrpura</li>
              <li><strong>NOVA:</strong> Tech bold con acento naranja</li>
              <li><strong>ZERO:</strong> Blanco y negro minimalista</li>
              <li><strong>PULSE:</strong> Stripe-like claro y profesional</li>
              <li><strong>EDGE:</strong> Monochrome sin bordes redondeados</li>
              <li>Cada tema ajusta: radios de esquinas, sombras, fondos, colores de acento</li>
            </ul>
          </Section>

          {/* Section: Client Portal */}
          <Section icon={<Shield className="h-5 w-5 text-gold-light" />} title="Portal del Cliente">
            <p>El <Link href="/dashboard/client-portal" className="text-lime-light hover:underline">Portal del Cliente</Link> permite a clientes ver el progreso de sus proyectos.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Los clientes ven solo los proyectos donde están vinculados</li>
              <li>Pueden ver tareas marcadas como "Visible para el cliente"</li>
              <li>Acceso con email + contraseña (configurable por admin)</li>
            </ul>
          </Section>

          {/* Section: Shortcuts */}
          <Section icon={<KeyboardIcon />} title="Atajos">
            <p>ClientFlow tiene atajos de teclado para navegación rápida. 
              <button onClick={onShortcutsClose} className="ml-1 text-lime-light hover:underline">Ver todos</button>
            </p>
          </Section>

          {/* Footer */}
          <div className="rounded-xl border border-border/50 bg-accent/20 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Desarrollado por{' '}
              <a href="https://www.distritow.com" target="_blank" rel="noopener" className="text-lime-light hover:underline">
                DistritoW
              </a>
              {' '}·{' '}
              <a href="https://lab.distritow.com" target="_blank" rel="noopener" className="text-lime-light hover:underline">
                lab.distritow.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/40 bg-accent/10 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
        {icon}
        {title}
      </h3>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function LayoutDashboardIcon() {
  return (
    <svg className="h-5 w-5 text-lime-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  )
}

function CheckSquareIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-1.106l-.447-.894A2 2 0 005.236 10H10m0 0h4m-4 0V6m0 0V3m0 3h4m-4 0a2 2 0 012-2h4a2 2 0 012 2v4m0 0v4m0-4h4m0 0l.447.894A2 2 0 0118.764 14H18m-4 0v4m0 0h4m-4 0a2 2 0 002 2h4a2 2 0 002-2v-4" />
    </svg>
  )
}
