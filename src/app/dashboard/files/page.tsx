'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { FileText, Upload, Download, Trash2, FolderOpen, Calendar, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProjectFile {
  id: string
  project_id: string | null
  name: string
  file_url: string
  file_type: string
  file_size: number | null
  created_at: string
}

interface Project {
  id: string
  name: string
}

export default function FilesPage() {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
      if (!profile?.company_id) { setLoading(false); return }

      const [{ data: filesData }, { data: projectsData }] = await Promise.all([
        supabase.from('project_files').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false }),
        supabase.from('projects').select('id, name').eq('company_id', profile.company_id),
      ])

      if (filesData) setFiles(filesData)
      if (projectsData) setProjects(projectsData)
      setLoading(false)
    }
    load()
  }, [])

  function getProjectName(id: string | null) {
    return projects.find(p => p.id === id)?.name || 'General'
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalSize = files.reduce((sum, f) => sum + (f.file_size || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Archivos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {files.length} archivo{files.length !== 1 ? 's' : ''} — {formatSize(totalSize)} total
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card glass>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{files.length}</p>
              <p className="text-xs text-muted-foreground">Archivos</p>
            </div>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <FolderOpen className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{new Set(files.map(f => f.project_id)).size}</p>
              <p className="text-xs text-muted-foreground">Proyectos</p>
            </div>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <HardDrive className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatSize(totalSize)}</p>
              <p className="text-xs text-muted-foreground">Almacenamiento</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && files.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Aún no hay archivos</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Los archivos que subas desde los proyectos aparecerán aquí.
          </p>
        </div>
      )}

      {/* Files list */}
      {!loading && files.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
          <div className="divide-y divide-border/30">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
                  <FileText className="h-4 w-4 text-gold-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{getProjectName(file.project_id)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(file.created_at).toLocaleDateString('es-MX')}
                    </span>
                    <span>{formatSize(file.file_size)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
