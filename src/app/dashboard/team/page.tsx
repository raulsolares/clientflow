'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Users,
  Mail,
  Shield,
  Calendar,
  UserCheck,
  MoreHorizontal,
  Circle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  avatar_url: string | null
}

const roleConfig: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-gold/10 text-gold-light border-gold/20' },
  manager: { label: 'Manager', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  member: { label: 'Miembro', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  viewer: { label: 'Espectador', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

export default function TeamPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) {
        setLoading(false)
        return
      }

      const { data: membersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active, created_at, avatar_url')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: true })

      if (membersData) setMembers(membersData)
      setLoading(false)
    }
    load()
  }, [router])

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} miembro{members.length !== 1 ? 's' : ''} en tu organización
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
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
        </div>
      )}

      {/* Team grid */}
      {!loading && members.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const role = roleConfig[member.role] || roleConfig.member
            return (
              <div
                key={member.id}
                className="rounded-xl border border-border/50 bg-card/30 p-5 hover:border-gold/20 hover:bg-card/50 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold/20 to-gold-dark/20 text-sm font-bold text-gold-light">
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
                    <div className="flex items-center gap-3 mt-2">
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
            Roles
          </h4>
          <div className="flex flex-wrap gap-4">
            {Object.entries(roleConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  key === 'admin' ? 'bg-gold-light' :
                  key === 'manager' ? 'bg-blue-400' :
                  key === 'member' ? 'bg-emerald-400' : 'bg-gray-400'
                }`} />
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
