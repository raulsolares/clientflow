'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Users,
  Mail,
  Shield,
  Calendar,
  UserCheck,
  MoreHorizontal,
  Circle,
  Plus,
  UserPlus,
  Clock,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useToast, ToastContainer } from '@/components/ui/toast'

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  is_client: boolean
  is_active: boolean
  created_at: string
  avatar_url: string | null
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  invited_by?: string
}

const roleConfig: Record<string, { label: string; color: string; icon: string }> = {
  admin: { label: 'Admin', color: 'bg-gold/10 text-gold-light border-gold/20', icon: '👑' },
  manager: { label: 'Manager', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: '⭐' },
  member: { label: 'Miembro', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: '👤' },
  viewer: { label: 'Espectador', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: '👁️' },
  client: { label: 'Cliente', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: '🤝' },
}

const allRoles = ['admin', 'manager', 'member', 'viewer', 'client']

export default function TeamPage() {
  const router = useRouter()
  const { toast, toasts } = useToast()
  const [members, setMembers] = useState<Profile[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [dbError, setDbError] = useState(false)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    setDbError(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      setCurrentUser(profile)
      setLoading(false)
      return
    }

    setCurrentUser(profile)

    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, is_client, is_active, created_at, avatar_url')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: true }),
      supabase
        .from('invitations')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (membersRes.data) setMembers(membersRes.data)

    if (invitesRes.error) {
      if (invitesRes.error.message?.includes('relation') || invitesRes.error.code === '42P01') {
        setDbError(true)
      }
    } else if (invitesRes.data) {
      setInvitations(invitesRes.data)
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const isAdmin = currentUser?.role === 'admin'
  const pendingInvites = invitations.filter((i) => i.status === 'pending')
  const expiredInvites = invitations.filter((i) => i.status === 'expired')

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setActionLoading(memberId)
    try {
      const res = await fetch('/api/team/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, newRole }),
      })
      const data = await res.json()
      if (data.success) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId
              ? { ...m, role: newRole === 'client' ? 'viewer' : newRole, is_client: newRole === 'client' }
              : m
          )
        )
        toast({ title: 'Rol actualizado', description: 'El rol del miembro se actualizó correctamente', variant: 'success' })
      } else {
        toast({ title: 'Error', description: data.error || 'No se pudo cambiar el rol', variant: 'error' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'error' })
    }
    setActionLoading(null)
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`¿Estás seguro de eliminar a "${memberName}" de la empresa?`)) return
    setActionLoading(memberId)
    try {
      const res = await fetch('/api/team/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const data = await res.json()
      if (data.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
        toast({ title: 'Miembro eliminado', description: 'El miembro fue removido de la empresa', variant: 'success' })
      } else {
        toast({ title: 'Error', description: data.error || 'No se pudo eliminar', variant: 'error' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'error' })
    }
    setActionLoading(null)
  }

  const handleRevokeInvite = async (inviteId: string) => {
    setActionLoading(inviteId)
    try {
      const res = await fetch('/api/invite/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inviteId }),
      })
      const data = await res.json()
      if (data.success) {
        setInvitations((prev) =>
          prev.map((i) => (i.id === inviteId ? { ...i, status: 'expired' } : i))
        )
        toast({ title: 'Invitación revocada', variant: 'success' })
      } else {
        toast({ title: 'Error', description: data.error, variant: 'error' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'error' })
    }
    setActionLoading(null)
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} miembro{members.length !== 1 ? 's' : ''}
            {pendingInvites.length > 0 && ` — ${pendingInvites.length} invitación(es) pendiente(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {isAdmin && (
            <Link href="/dashboard/team/invite">
              <Button size="sm">
                <UserPlus className="h-4 w-4" />
                Invitar
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* DB Migration Warning */}
      {dbError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-400">Migración pendiente</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Ejecuta la migración SQL en supabase/migration_002_project_members.sql para habilitar invitaciones y gestión avanzada de miembros.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime border-t-transparent" />
        </div>
      )}

      {/* Pending Invitations */}
      {!loading && pendingInvites.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Invitaciones pendientes</h3>
            <Badge variant="pending" size="sm">{pendingInvites.length}</Badge>
          </div>
          <div className="divide-y divide-border/30">
            {pendingInvites.map((inv) => {
              const role = roleConfig[inv.role] || roleConfig.member
              const expires = new Date(inv.expires_at)
              const isExpiringSoon = expires.getTime() - Date.now() < 86400000 // < 24h
              return (
                <div key={inv.id} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <Mail className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge className={`text-[10px] px-2 py-0.5 ${role.color}`}>{role.label}</Badge>
                      <span className={`text-[10px] flex items-center gap-1 ${isExpiringSoon ? 'text-red-400' : 'text-muted-foreground'}`}>
                        <Clock className="h-3 w-3" />
                        Expira {expires.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleRevokeInvite(inv.id)}
                      disabled={actionLoading === inv.id}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && members.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-16 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Aún no hay miembros</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Los miembros del equipo aparecerán aquí cuando se unan a la organización.
          </p>
          {isAdmin && (
            <Link href="/dashboard/team/invite">
              <Button className="mt-4" size="sm">
                <UserPlus className="h-4 w-4" />
                Invitar miembros
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Team grid */}
      {!loading && members.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const role = roleConfig[member.role] || roleConfig.member
            const isCurrentUser = currentUser?.id === member.id
            return (
              <div
                key={member.id}
                className="rounded-xl border border-border/50 bg-card/30 p-5 hover:border-lime/20 hover:bg-card/50 transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lime/20 to-cyan/20 text-sm font-bold text-lime-light">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name || member.email}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(member.full_name || member.email)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {member.full_name || 'Sin nombre'}
                      </h3>
                      {isCurrentUser && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime/10 text-lime-light border border-lime/20">
                          Tú
                        </span>
                      )}
                      <span className={`h-2 w-2 rounded-full shrink-0 ${
                        member.is_active ? 'bg-emerald-400' : 'bg-red-400'
                      }`} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <Badge className={`text-[10px] px-2 py-0.5 ${role.color}`}>
                        {role.label}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(member.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions - Admin only */}
                  {isAdmin && !isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Cambiar rol</DropdownMenuLabel>
                        {allRoles.map((r) => {
                          const rCfg = roleConfig[r] || roleConfig.member
                          const isCurrent = member.role === r || (r === 'client' && member.is_client)
                          return (
                            <DropdownMenuItem
                              key={r}
                              disabled={actionLoading === member.id || isCurrent}
                              onClick={() => handleRoleChange(member.id, r)}
                              className={isCurrent ? 'text-lime-light' : ''}
                            >
                              {rCfg.icon} {rCfg.label}
                              {isCurrent && ' ✓'}
                            </DropdownMenuItem>
                          )
                        })}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-400"
                          onClick={() => handleRemoveMember(member.id, member.full_name || member.email)}
                          disabled={actionLoading === member.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar miembro
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Role legend */}
      {!loading && members.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/20 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Roles y permisos
          </h4>
          <div className="flex flex-wrap gap-4">
            {Object.entries(roleConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  key === 'admin' ? 'bg-lime-light' :
                  key === 'manager' ? 'bg-blue-400' :
                  key === 'member' ? 'bg-emerald-400' :
                  key === 'client' ? 'bg-violet-400' : 'bg-gray-400'
                }`} />
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired invitations */}
      {!loading && expiredInvites.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/20 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <XCircle className="h-3 w-3 text-red-400" />
            Invitaciones expiradas ({expiredInvites.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {expiredInvites.map((inv) => (
              <Badge key={inv.id} variant="outline" size="sm" className="text-muted-foreground">
                {inv.email}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
