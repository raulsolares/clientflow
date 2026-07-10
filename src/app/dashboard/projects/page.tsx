'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, FolderKanban, MoreHorizontal, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  start_date: string | null
  end_date: string | null
  client_id: string | null
  color: string
  created_at: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planificación', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  active: { label: 'Activo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  on_hold: { label: 'En pausa', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completed: { label: 'Completado', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'text-muted-foreground' },
  medium: { label: 'Media', color: 'text-gold-light' },
  high: { label: 'Alta', color: 'text-orange-400' },
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) setProjects(data)
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="gold-glow">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo proyecto
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proyectos..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-16 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            {search ? 'Sin resultados' : 'Aún no hay proyectos'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            {search
              ? `No se encontraron proyectos con "${search}"`
              : 'Crea tu primer proyecto para empezar a gestionar tu trabajo.'}
          </p>
          {!search && (
            <Link href="/dashboard/projects/new">
              <Button className="mt-6 gold-glow">
                <Plus className="mr-2 h-4 w-4" />
                Crear primer proyecto
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Projects grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 hover:border-gold/20 hover:bg-card/80 transition-all duration-200"
            >
              {/* Color bar */}
              <div
                className="h-1.5 rounded-full mb-4 w-16"
                style={{ backgroundColor: project.color || '#c9a961' }}
              />

              {/* Title & status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-foreground group-hover:text-gold-light transition-colors line-clamp-1">
                  {project.name}
                </h3>
                <Badge className={`shrink-0 text-[11px] px-2 py-0.5 border ${statusLabels[project.status]?.color || ''}`}>
                  {statusLabels[project.status]?.label || project.status}
                </Badge>
              </div>

              {/* Description */}
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {project.description}
                </p>
              )}

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
                <span className={`font-medium ${priorityLabels[project.priority]?.color || ''}`}>
                  ● {priorityLabels[project.priority]?.label || project.priority}
                </span>
                {project.end_date && (
                  <span>
                    {new Date(project.end_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
