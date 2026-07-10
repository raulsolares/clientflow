'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  FileText,
  Upload,
  Download,
  Trash2,
  FolderOpen,
  Calendar,
  HardDrive,
  X,
  File,
  Image,
  FileSpreadsheet,
  FileArchive,
  FileAudio,
  FileVideo,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast, ToastContainer } from '@/components/ui/toast'

interface ProjectFile {
  id: string
  project_id: string | null
  company_id: string
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string
  category: string
  visible_to_client: boolean
  uploaded_by: string | null
  created_at: string
}

interface Project {
  id: string
  name: string
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
  'application/json',
  'text/html',
  'video/mp4',
  'audio/mpeg',
  'audio/wav',
]

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return Image
  if (mime.startsWith('video/')) return FileVideo
  if (mime.startsWith('audio/')) return FileAudio
  if (mime.includes('pdf')) return FileText
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return FileArchive
  return File
}

function getFileColor(mime: string) {
  if (mime.startsWith('image/')) return 'text-blue-400 bg-blue-500/10'
  if (mime.startsWith('video/')) return 'text-violet-400 bg-violet-500/10'
  if (mime.startsWith('audio/')) return 'text-amber-400 bg-amber-500/10'
  if (mime.includes('pdf')) return 'text-red-400 bg-red-500/10'
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return 'text-emerald-400 bg-emerald-500/10'
  if (mime.includes('zip') || mime.includes('rar')) return 'text-cyan-400 bg-cyan-500/10'
  return 'text-gold-light bg-gold/10'
}

export default function FilesPage() {
  const { toast, toasts } = useToast()
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [dbError, setDbError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    setDbError(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) { setLoading(false); return }

    setUserRole(profile.role)
    setUserId(user.id)

    const [{ data: filesData }, { data: projectsData }] = await Promise.all([
      supabase
        .from('project_files')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', profile.company_id),
    ])

    if (filesData) setFiles(filesData)
    if (projectsData) setProjects(projectsData)

    if (!filesData && !projectsData) {
      setDbError(true)
    }

    setLoading(false)
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  const getProjectName = (id: string | null) =>
    projects.find((p) => p.id === id)?.name || 'General'

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalSize = files.reduce((sum, f) => sum + (f.file_size || 0), 0)

  const canDelete = (file: ProjectFile) =>
    userRole === 'admin' || userRole === 'manager' || file.uploaded_by === userId

  const handleUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'Error', description: `"${file.name}" excede el límite de 50MB`, variant: 'error' })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        setFiles((prev) => [data.file, ...prev])
        toast({ title: 'Archivo subido', description: file.name, variant: 'success' })
      } else {
        toast({ title: 'Error', description: data.detail || data.error || 'Error al subir', variant: 'error' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'error' })
    }
    setUploading(false)
  }

  const handleDelete = async (file: ProjectFile) => {
    if (!confirm(`¿Eliminar "${file.file_name}" permanentemente?`)) return

    try {
      const res = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, fileUrl: file.file_url }),
      })
      const data = await res.json()

      if (data.success) {
        setFiles((prev) => prev.filter((f) => f.id !== file.id))
        toast({ title: 'Archivo eliminado', variant: 'success' })
      } else {
        toast({ title: 'Error', description: data.error || 'No se pudo eliminar', variant: 'error' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'error' })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleUpload(droppedFile)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Archivos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {files.length} archivo{files.length !== 1 ? 's' : ''} — {formatSize(totalSize)} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadFiles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Subiendo...' : 'Subir archivo'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept={ACCEPTED_TYPES.join(',')}
          />
        </div>
      </div>

      {/* DB Migration Warning */}
      {dbError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-400">Migración pendiente</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Ejecuta la migración SQL en supabase/migration_002_project_members.sql para habilitar la gestión completa de archivos.
            </p>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-lime bg-lime/5 scale-[1.02]'
            : 'border-border/50 bg-card/30 hover:border-lime/30 hover:bg-card/50'
        }`}
      >
        <Upload className={`mx-auto h-8 w-8 mb-2 transition-colors ${
          dragOver ? 'text-lime-light' : 'text-muted-foreground/40'
        }`} />
        <p className={`text-sm font-medium ${
          dragOver ? 'text-lime-light' : 'text-foreground'
        }`}>
          {dragOver ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic para subir'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, Word, Excel, imágenes, hasta 50MB
        </p>
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
              <p className="text-2xl font-bold text-foreground">{new Set(files.map((f) => f.project_id)).size}</p>
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && files.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Aún no hay archivos</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Arrastra archivos aquí o haz clic en "Subir archivo" para comenzar.
          </p>
        </div>
      )}

      {/* Files list */}
      {!loading && files.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Todos los archivos
            </h3>
            <span className="text-xs text-muted-foreground">{files.length} archivo(s)</span>
          </div>
          <div className="divide-y divide-border/30">
            {files.map((file) => {
              const Icon = getFileIcon(file.mime_type)
              const iconColor = getFileColor(file.mime_type)
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors group"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{getProjectName(file.project_id)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(file.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span>{formatSize(file.file_size)}</span>
                      <Badge variant="outline" size="sm" className="text-[10px]">
                        {file.mime_type.split('/').pop()?.toUpperCase() || '?'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Descargar"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    {canDelete(file) && (
                      <button
                        onClick={() => handleDelete(file)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
