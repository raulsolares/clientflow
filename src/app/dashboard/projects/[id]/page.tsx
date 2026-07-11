'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Edit3, Trash2, Plus, Clock, Calendar,
  Users, UserPlus, X, Mail, Shield, UserCheck,
  ChevronDown, ChevronRight, Search, LayoutDashboard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText, Upload, Download, File, Image,
  FileSpreadsheet, FileArchive, FileAudio, FileVideo,
  Calendar as CalendarIcon, Loader2, Link2, ExternalLink,
} from 'lucide-react'

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
  created_by: string | null
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  assigned_to: string | null
}

interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
  invited_by: string | null
  created_at: string
  user?: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
  inviter?: {
    full_name: string | null
  } | null
}

interface ProjectFile {
  id: string
  project_id: string | null
  client_id: string | null
  company_id: string
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string
  category: string
  uploaded_by: string | null
  created_at: string
  is_link: boolean | null
  link_url: string | null
}

function getFileIcon(mime: string, isLink?: boolean) {
  if (isLink) return Link2
  if (mime.startsWith('image/')) return Image
  if (mime.startsWith('video/')) return FileVideo
  if (mime.startsWith('audio/')) return FileAudio
  if (mime.includes('pdf')) return FileText
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return FileArchive
  return File
}

function getFileColor(mime: string, isLink?: boolean) {
  if (isLink) return 'text-sky-400 bg-sky-500/10'
  if (mime.startsWith('image/')) return 'text-blue-400 bg-blue-500/10'
  if (mime.startsWith('video/')) return 'text-violet-400 bg-violet-500/10'
  if (mime.startsWith('audio/')) return 'text-amber-400 bg-amber-500/10'
  if (mime.includes('pdf')) return 'text-red-400 bg-red-500/10'
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return 'text-emerald-400 bg-emerald-500/10'
  if (mime.includes('zip') || mime.includes('rar')) return 'text-cyan-400 bg-cyan-500/10'
  return 'text-gold-light bg-gold/10'
}

function formatSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ProfileSearchResult {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planificación', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  active: { label: 'Activo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  on_hold: { label: 'En pausa', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completed: { label: 'Completado', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const roleConfig: Record<string, { label: string; color: string; icon: any }> = {
  manager: { label: 'Manager', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: Shield },
  editor: { label: 'Editor', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: UserCheck },
  viewer: { label: 'Viewer', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: UserCheck },
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')

  // Member management state
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdminOrManager, setIsAdminOrManager] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('viewer')
  const [addingMember, setAddingMember] = useState(false)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  // Files state
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileUploadMode, setFileUploadMode] = useState<'upload' | 'link'>('upload')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkName, setLinkName] = useState('')
  const [linkDescription, setLinkDescription] = useState('')
  const [addingLink, setAddingLink] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) { setLoading(false); return }

      setCompanyId(profile.company_id)
      setCurrentUserRole(profile.role)
      const canManage = profile.role === 'admin' || profile.role === 'manager'
      setIsAdminOrManager(canManage)

      // Load project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!projectData) { router.push('/dashboard/projects'); return }
      setProject(projectData)

      // Load tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })

      if (tasksData) setTasks(tasksData)

      // Load members
      await loadMembers(supabase, projectData.company_id)

      // Load project files
      setLoadingFiles(true)
      const { data: filesData } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })
      if (filesData) setProjectFiles(filesData)
      setLoadingFiles(false)

      setLoading(false)
    }
    load()
  }, [params.id, router])

  async function handleProjectFileUpload(file: File) {
    if (file.size > 1 * 1024 * 1024) {
      alert('El archivo excede el límite de 1MB. Para archivos más grandes, usa "Agregar enlace".')
      return
    }

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('project_id', params.id as string)

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        setProjectFiles(prev => [data.file, ...prev])
      } else {
        alert(data.detail || data.error || 'Error al subir archivo')
      }
    } catch {
      alert('Error de conexión al subir archivo')
    }
    setUploadingFile(false)
  }

  async function handleProjectFileDelete(file: ProjectFile) {
    if (!confirm(`¿Eliminar "${file.file_name}" permanentemente?`)) return

    try {
      const res = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id }),
      })
      const data = await res.json()

      if (data.success) {
        setProjectFiles(prev => prev.filter(f => f.id !== file.id))
      } else {
        alert(data.error || 'No se pudo eliminar el archivo')
      }
    } catch {
      alert('Error de conexión al eliminar archivo')
    }
  }

  async function handleAddLink() {
    if (!linkUrl.trim() || !linkName.trim() || !project) return
    setAddingLink(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) return

      const { data, error } = await supabase
        .from('project_files')
        .insert({
          company_id: profile.company_id,
          project_id: project.id,
          file_name: linkName.trim(),
          file_url: linkUrl.trim(),
          link_url: linkUrl.trim(),
          mime_type: 'link',
          is_link: true,
          category: 'link',
          uploaded_by: user.id,
          file_size: 0,
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding link:', error)
        alert('Error al agregar enlace: ' + error.message)
      } else if (data) {
        setProjectFiles(prev => [data, ...prev])
        setLinkUrl('')
        setLinkName('')
        setLinkDescription('')
      }
    } catch (err) {
      console.error(err)
    }
    setAddingLink(false)
  }

  async function loadMembers(supabase: any, companyId?: string) {
    try {
      // Use direct query with proper joins
      const { data: directData, error: directError } = await supabase
        .from('project_members')
        .select(`
          id, project_id, user_id, role, invited_by, created_at,
          user:profiles!project_members_user_id_fkey(id, full_name, email),
          inviter:profiles!project_members_invited_by_fkey(full_name)
        `)
        .eq('project_id', params.id)

      if (!directError && directData) {
        setMembers(directData || [])
        setMigrationNeeded(false)
        return
      }

      // Fallback: try RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_project_members', { p_project_id: params.id })

      if (!rpcError && rpcData) {
        // RPC returns flat objects with user_full_name etc.
        const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData
        const mapped = (Array.isArray(parsed) ? parsed : []).map((m: any) => ({
          id: m.id,
          project_id: m.project_id,
          user_id: m.user_id,
          role: m.role,
          invited_by: m.invited_by,
          created_at: m.created_at,
          user: { id: m.user_id, full_name: m.user_full_name, email: m.user_email, avatar_url: null },
          inviter: m.inviter_name ? { full_name: m.inviter_name } : null,
        }))
        setMembers(mapped)
        setMigrationNeeded(false)
        return
      }

      // Last fallback: select basic members
      const { data: basicData } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', params.id)

      if (basicData) {
        setMembers(basicData as ProjectMember[])
        setMigrationNeeded(false)
      }
    } catch {
      setMigrationNeeded(true)
    }
  }

  async function addTask() {
    if (!newTask.trim() || !project) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    await supabase.from('tasks').insert({
      company_id: profile?.company_id,
      project_id: project.id,
      title: newTask.trim(),
      status: 'pending',
      priority: 'medium',
    })

    setNewTask('')
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
  }

  async function toggleTaskStatus(task: Task) {
    const supabase = createClient()
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  async function deleteProject() {
    if (!confirm('¿Estás seguro de eliminar este proyecto?')) return
    const supabase = createClient()
    await supabase.from('projects').delete().eq('id', params.id)
    router.push('/dashboard/projects')
  }

  // Search profiles to add as member
  async function searchProfiles(query: string) {
    if (query.trim().length < 2) { setSearchResults([]); return }
    setMemberSearch(query)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('company_id', profile.company_id)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10)

    // Filter out existing members
    const existingIds = new Set(members.map(m => m.user_id))
    const filtered = (data || []).filter(p => !existingIds.has(p.id))
    setSearchResults(filtered)
  }

  async function addMember(userId: string) {
    if (!project) return
    setAddingMember(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAddingMember(false); return }

    const { error } = await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: userId,
      role: selectedRole,
      invited_by: user.id,
    })

    if (error) {
      console.error('Error adding member:', error)
      alert('Error al agregar miembro: ' + error.message)
    } else {
      await loadMembers(supabase)
      setShowAddMember(false)
      setMemberSearch('')
      setSearchResults([])
      setSelectedRole('viewer')
    }
    setAddingMember(false)
  }

  async function removeMember(memberId: string) {
    if (!confirm('¿Estás seguro de remover este miembro del proyecto?')) return
    const supabase = createClient()

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      console.error('Error removing member:', error)
      alert('Error al remover miembro: ' + error.message)
    } else {
      setMembers(prev => prev.filter(m => m.id !== memberId))
    }
  }

  async function updateMemberRole(memberId: string, newRole: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      console.error('Error updating role:', error)
      alert('Error al actualizar rol: ' + error.message)
    } else {
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role: newRole } : m
      ))
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  )

  if (!project) return null

  const taskCounts = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status !== 'completed').length,
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a proyectos
      </Link>

      {/* Project header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-3 w-3 rounded-full mt-1.5" style={{ backgroundColor: project.color || '#c9a961' }} />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/projects/${project.id}/dashboard`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground" title="Dashboard">
              <LayoutDashboard className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/dashboard/projects/${project.id}/edit`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Edit3 className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={deleteProject} className="text-muted-foreground hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Meta badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className={`border ${statusLabels[project.status]?.color || ''}`} size="sm">
          {statusLabels[project.status]?.label || project.status}
        </Badge>
        {project.end_date && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Entrega: {new Date(project.end_date).toLocaleDateString('es-MX')}
          </span>
        )}
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {taskCounts.completed}/{taskCounts.total} tareas
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {members.length} miembros
        </span>
      </div>

      {/* Migration needed */}
      {migrationNeeded && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-400 font-medium">
            ⚡ Migración pendiente
          </p>
          <p className="text-xs text-amber-400/70 mt-1">
            Ejecuta la migración SQL en supabase/migration_002_project_members.sql para habilitar la gestión completa de miembros.
          </p>
        </div>
      )}

      {/* Members Section */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gold-light" />
              Miembros ({members.length})
            </span>
            {isAdminOrManager && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddMember(!showAddMember)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Agregar miembro
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add member form */}
          {showAddMember && isAdminOrManager && (
            <div className="mb-4 p-4 rounded-lg border border-border/50 bg-accent/20 space-y-3">
              <h4 className="text-sm font-medium text-foreground">Agregar miembro al proyecto</h4>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  className="pl-9"
                  value={memberSearch}
                  onChange={(e) => searchProfiles(e.target.value)}
                />
              </div>

              {/* Role select */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rol en el proyecto</label>
                <select
                  className="h-9 rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-foreground w-full"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="viewer">Viewer — Solo lectura</option>
                  <option value="editor">Editor — Puede editar tareas</option>
                  <option value="manager">Manager — Gestión completa</option>
                </select>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="rounded-lg border border-border/50 divide-y divide-border/30 max-h-48 overflow-y-auto">
                  {searchResults.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gold/20 flex items-center justify-center text-xs font-medium text-gold-light shrink-0">
                          {profile.full_name?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {profile.full_name || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addMember(profile.id)}
                        disabled={addingMember}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {memberSearch.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No se encontraron miembros con ese criterio
                </p>
              )}

              <button
                onClick={() => { setShowAddMember(false); setMemberSearch(''); setSearchResults([]) }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Members list */}
          {members.length === 0 && !migrationNeeded && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay miembros en este proyecto
            </p>
          )}

          {members.length > 0 && (
            <div className="space-y-2">
              {members.map((member) => {
                const userName = (member as any).user?.full_name || 'Usuario'
                const userEmail = (member as any).user?.email || ''
                const inviterName = (member as any).inviter?.full_name
                const RoleIcon = roleConfig[member.role]?.icon

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gold/20 flex items-center justify-center text-sm font-medium text-gold-light shrink-0">
                        {userName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                          {member.user_id === currentUserId && (
                            <span className="text-[10px] text-muted-foreground bg-accent/40 px-1.5 py-0.5 rounded">(tú)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                          {inviterName && (
                            <span className="text-[10px] text-muted-foreground">
                              · Invitado por {inviterName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role badge / selector */}
                      {isAdminOrManager && member.user_id !== currentUserId ? (
                        <select
                          className="h-7 rounded-md border border-border/50 bg-card px-2 text-xs text-foreground"
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value)}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="manager">Manager</option>
                        </select>
                      ) : (
                        <Badge
                          size="sm"
                          className={`text-[10px] px-2 py-0.5 border flex items-center gap-1 ${
                            roleConfig[member.role]?.color || ''
                          }`}
                        >
                          {RoleIcon && <RoleIcon className="h-2.5 w-2.5" />}
                          {roleConfig[member.role]?.label || member.role}
                        </Badge>
                      )}

                      {/* Remove button */}
                      {isAdminOrManager && member.user_id !== currentUserId && (
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          title="Remover miembro"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks section */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Tareas</span>
            <span className="text-sm font-normal text-muted-foreground">
              {taskCounts.pending} pendientes
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add task */}
          <div className="flex gap-2">
            <Input
              placeholder="Agregar tarea rápida..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
            />
            <Button onClick={addTask} disabled={!newTask.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Task list */}
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay tareas aún. Agrega la primera.
            </p>
          )}

          <div className="space-y-1">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/dashboard/tasks/${task.id}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors group"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleTaskStatus(task)
                  }}
                  className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                    task.status === 'completed'
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-border hover:border-gold/50'
                  }`}
                >
                  {task.status === 'completed' && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${
                    task.status === 'completed'
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground'
                  }`}>
                    {task.title}
                  </span>
                </div>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(task.due_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Archivos section */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gold-light" />
              Archivos ({projectFiles.length})
            </span>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border/50 overflow-hidden">
                <button
                  onClick={() => setFileUploadMode('upload')}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${
                    fileUploadMode === 'upload'
                      ? 'bg-gold/20 text-gold-light'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Subir archivo
                </button>
                <button
                  onClick={() => setFileUploadMode('link')}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${
                    fileUploadMode === 'link'
                      ? 'bg-gold/20 text-gold-light'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Agregar enlace
                </button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 1MB note */}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            📎 Archivos hasta 1MB. Para archivos más grandes, agrega un enlace externo (Drive, Dropbox, etc.)
          </p>

          {/* Upload mode */}
          {fileUploadMode === 'upload' && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 1 * 1024 * 1024) {
                      alert('El archivo excede el límite de 1MB. Para archivos más grandes, usa la opción "Agregar enlace".')
                      if (fileInputRef.current) fileInputRef.current.value = ''
                      return
                    }
                    handleProjectFileUpload(file)
                  }
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              />
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
              >
                {uploadingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadingFile ? 'Subiendo...' : 'Subir archivo'}
              </Button>
            </div>
          )}

          {/* Link mode */}
          {fileUploadMode === 'link' && (
            <div className="space-y-3 rounded-lg border border-border/50 bg-accent/10 p-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">URL del enlace *</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-1.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
                <input
                  type="text"
                  placeholder="Nombre del enlace"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-1.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción (opcional)</label>
                <textarea
                  placeholder="Descripción del enlace..."
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                  className="flex min-h-[50px] w-full rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 py-1.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <Button
                size="sm"
                onClick={handleAddLink}
                disabled={!linkUrl.trim() || !linkName.trim() || addingLink}
              >
                {addingLink ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Link2 className="h-4 w-4 mr-1" />
                )}
                {addingLink ? 'Guardando...' : 'Agregar enlace'}
              </Button>
            </div>
          )}

          {loadingFiles ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-lime border-t-transparent" />
            </div>
          ) : projectFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay archivos vinculados a este proyecto. Sube el primero.
            </p>
          ) : (
            <div className="divide-y divide-border/30">
              {projectFiles.map((file) => {
                const isLink = file.is_link || file.mime_type === 'link'
                const Icon = getFileIcon(file.mime_type, !!isLink)
                const iconColor = getFileColor(file.mime_type, !!isLink)
                const canDeleteFile = currentUserRole === 'admin' || currentUserRole === 'manager' || file.uploaded_by === currentUserId
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 py-3 hover:bg-accent/30 transition-colors group"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isLink ? (
                          <span className="flex items-center gap-1 text-sky-400">
                            <Link2 className="h-3 w-3" />
                            Enlace externo
                          </span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {new Date(file.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </span>
                            <span>{formatSize(file.file_size)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isLink ? (
                        <a
                          href={file.link_url || file.file_url}
                          target="_blank"
                          rel="noopener"
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          title="Abrir enlace"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener"
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          title="Descargar"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {canDeleteFile && (
                        <button
                          onClick={() => handleProjectFileDelete(file)}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
