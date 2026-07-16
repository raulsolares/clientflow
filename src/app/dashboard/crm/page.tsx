'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Users, Search, Phone, Mail, Building2, Calendar,
  User, FileText, Plus, MessageSquare, PhoneCall,
  CheckCircle2, Clock, ArrowRight, MoreHorizontal,
  Star, StarOff, Filter, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ClientWithStats {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string | null
  logo_url: string | null
  status: string
  notes: string | null
  projects_count: number
  recent_notes: number
  pending_actions: number
}

export default function CrmPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) { setLoading(false); return }
      setUserRole(profile.role)
      const isAdmin = profile.role === 'admin' || profile.role === 'manager'

      // Load clients
      let query = supabase
        .from('clients')
        .select('*')
        .order('company_name', { ascending: true })

      if (!isAdmin) {
        const { data: permissions } = await supabase
          .from('client_permissions')
          .select('client_id')
          .eq('user_id', user.id)
        const permittedIds = (permissions || []).map(p => p.client_id)
        if (permittedIds.length > 0) {
          query = supabase
            .from('clients')
            .select('*')
            .in('id', permittedIds)
            .order('company_name', { ascending: true })
        } else {
          setClients([])
          setLoading(false)
          return
        }
      }

      const { data: clientsData } = await query
      if (!clientsData) { setLoading(false); return }

      // Get stats per client
      const clientIds = clientsData.map(c => c.id)
      const enriched: ClientWithStats[] = await Promise.all(
        clientsData.map(async (c) => {
          const { count: pCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', c.id)
            .is('deleted_at', null)

          const { count: nCount } = await supabase
            .from('client_notes')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', c.id)
            .is('deleted_at', null)

          const { count: aCount } = await supabase
            .from('client_actions')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', c.id)
            .is('deleted_at', null)
            .is('completed_at', null)

          return {
            ...c,
            projects_count: pCount || 0,
            recent_notes: nCount || 0,
            pending_actions: aCount || 0,
          }
        })
      )

      setClients(enriched)
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const matchesSearch = !q || 
      c.company_name.toLowerCase().includes(q) ||
      c.contact_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gold-light" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión de relaciones con clientes — notas, acciones y seguimiento
          </p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button variant="default" className="lime-glow">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-gold/15 text-gold-light border border-gold/20'
                  : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No hay clientes registrados</p>
          <Link href="/dashboard/clients/new">
            <Button variant="default" className="lime-glow mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Cliente
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
              <Card className="hover:border-gold/30 transition-all group cursor-pointer h-full">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                        {client.logo_url ? (
                          <img src={client.logo_url} alt="" className="w-8 h-8 rounded object-contain" />
                        ) : (
                          <Building2 className="h-5 w-5 text-gold-light" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-gold-light transition-colors">
                          {client.company_name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{client.contact_name}</p>
                      </div>
                    </div>
                    <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>
                      {client.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {/* Contact */}
                  <div className="space-y-1.5 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {client.projects_count} proyectos
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {client.recent_notes} notas
                    </span>
                    {(client.pending_actions ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Clock className="h-3.5 w-3.5" />
                        {client.pending_actions} pendientes
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
