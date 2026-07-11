'use client'

import { useEffect, useState } from 'react'
import { X, Search, Shield, Building2, FolderKanban, CheckSquare, Users, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Client {
  id: string
  company_name: string
  contact_name: string
  status: string
}

interface Project {
  id: string
  name: string
  status: string
}

interface PermissionsModalProps {
  open: boolean
  onClose: () => void
  userId: string
  userName: string
}

export function PermissionsModal({ open, onClose, userId, userName }: PermissionsModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'clientes' | 'proyectos'>('clientes')

  useEffect(() => {
    if (!open) return

    async function load() {
      setLoading(true)
      try {
        // Load client permissions
        const clientRes = await fetch(`/api/permissions/clients?userId=${userId}`)
        const clientData = await clientRes.json()

        if (clientData.clients) setClients(clientData.clients)
        if (clientData.permissions) setSelectedClients(new Set(clientData.permissions))

        // Load project permissions
        const projectRes = await fetch(`/api/permissions/projects?userId=${userId}`)
        const projectData = await projectRes.json()

        if (projectData.projects) setProjects(projectData.projects)
        if (projectData.permissions) setSelectedProjects(new Set(projectData.permissions))
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, userId])

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
    setSaved(false)
  }

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
    setSaved(false)
  }

  const saveClientPermissions = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/permissions/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          clientIds: Array.from(selectedClients),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const saveProjectPermissions = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/permissions/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          projectIds: Array.from(selectedProjects),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.contact_name?.toLowerCase() || '').includes(clientSearch.toLowerCase())
  )

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime/20 to-cyan/20">
              <Shield className="h-5 w-5 text-lime-light" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Permisos</h2>
              <p className="text-xs text-muted-foreground">{userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-1 border-b border-border/30 pb-3 mb-4">
          <button
            onClick={() => setActiveTab('clientes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'clientes'
                ? 'bg-gold/10 text-gold-light border border-gold/20'
                : 'text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Clientes
            <span className="text-[10px] opacity-60">({selectedClients.size}/{clients.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('proyectos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'proyectos'
                ? 'bg-gold/10 text-gold-light border border-gold/20'
                : 'text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            Proyectos
            <span className="text-[10px] opacity-60">({selectedProjects.size}/{projects.length})</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
          </div>
        ) : activeTab === 'clientes' ? (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setSelectedClients(new Set(clients.map(c => c.id)))}
                className="text-[11px] font-medium text-lime-light hover:text-lime transition-colors"
              >
                Seleccionar todos
              </button>
              <span className="text-muted-foreground/30">·</span>
              <button
                onClick={() => setSelectedClients(new Set())}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpiar
              </button>
            </div>

            {/* Client list */}
            {filteredClients.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground/60">
                {clientSearch ? 'Sin resultados' : 'No hay clientes'}
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => toggleClient(client.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      selectedClients.has(client.id)
                        ? 'bg-lime/5 border border-lime/20'
                        : 'hover:bg-accent/30 border border-transparent'
                    }`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                      selectedClients.has(client.id)
                        ? 'border-lime-light bg-lime-light text-lime-foreground'
                        : 'border-muted-foreground/30'
                    }`}>
                      {selectedClients.has(client.id) && (
                        <CheckSquare className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {client.company_name}
                      </p>
                      {client.contact_name && (
                        <p className="text-[11px] text-muted-foreground truncate">{client.contact_name}</p>
                      )}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      client.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : client.status === 'inactive'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {client.status === 'active' ? 'Activo' : client.status === 'inactive' ? 'Inactivo' : client.status}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Save */}
            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border/30">
              {saved && <span className="text-[11px] text-emerald-400">Permisos guardados</span>}
              <Button size="sm" onClick={saveClientPermissions} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Guardar permisos de clientes
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Buscar proyecto..."
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setSelectedProjects(new Set(projects.map(p => p.id)))}
                className="text-[11px] font-medium text-lime-light hover:text-lime transition-colors"
              >
                Seleccionar todos
              </button>
              <span className="text-muted-foreground/30">·</span>
              <button
                onClick={() => setSelectedProjects(new Set())}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpiar
              </button>
            </div>

            {/* Project list */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground/60">
                {projectSearch ? 'Sin resultados' : 'No hay proyectos'}
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      selectedProjects.has(project.id)
                        ? 'bg-lime/5 border border-lime/20'
                        : 'hover:bg-accent/30 border border-transparent'
                    }`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                      selectedProjects.has(project.id)
                        ? 'border-lime-light bg-lime-light text-lime-foreground'
                        : 'border-muted-foreground/30'
                    }`}>
                      {selectedProjects.has(project.id) && (
                        <CheckSquare className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {project.name}
                      </p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      project.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : project.status === 'planning'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {project.status === 'active' ? 'Activo' : project.status === 'planning' ? 'Planificación' : project.status}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Save */}
            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border/30">
              {saved && <span className="text-[11px] text-emerald-400">Permisos guardados</span>}
              <Button size="sm" onClick={saveProjectPermissions} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Guardar permisos de proyectos
              </Button>
            </div>
          </>
        )}

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
            Los permisos determinan qué {activeTab === 'clientes' ? 'clientes' : 'proyectos'} puede ver este usuario.
            Si no seleccionas ninguno, solo verá contenido público.
          </p>
        </div>
      </div>
    </div>
  )
}
