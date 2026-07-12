'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, Users, Search, Phone, Mail, Building2, Calendar, Briefcase, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import ClientPortalView from './client-portal-content'

interface Client {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string | null
  logo_url: string | null
  notes: string | null
  status: string
  created_at: string
}

type ActiveTab = 'clientes' | 'portal'

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<ActiveTab>('clientes')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get current user's role and company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single()

      const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

      if (isAdmin || !profile?.company_id) {
        // Admins see all clients
        const { data } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })
        if (data) setClients(data)
      } else {
        // Non-admins: filter by client_permissions
        const { data: permissions } = await supabase
          .from('client_permissions')
          .select('client_id')
          .eq('user_id', user.id)

        const permittedIds = (permissions || []).map(p => p.client_id)
        
        if (permittedIds.length > 0) {
          const { data } = await supabase
            .from('clients')
            .select('*')
            .in('id', permittedIds)
            .order('created_at', { ascending: false })
          if (data) setClients(data)
        } else {
          setClients([])
        }
      }
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company?.toLowerCase() || '').includes(search.toLowerCase())
  )

  const tabClass = (tab: ActiveTab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === tab
        ? 'bg-gold/10 text-gold-light border border-gold/20'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
    }`

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/30 pb-3">
        <button
          className={tabClass('clientes')}
          onClick={() => setActiveTab('clientes')}
        >
          <Users className="h-4 w-4 inline mr-1.5" />
          Clientes
          {!loading && <span className="ml-1.5 text-xs opacity-60">({clients.length})</span>}
        </button>
        <button
          className={tabClass('portal')}
          onClick={() => setActiveTab('portal')}
        >
          <Briefcase className="h-4 w-4 inline mr-1.5" />
          Portal
        </button>
      </div>

      {/* Tab: Clientes */}
      {activeTab === 'clientes' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {clients.length} cliente{clients.length !== 1 ? 's' : ''} registrados
              </p>
            </div>
            <Link href="/dashboard/clients/new">
              <Button className="lime-glow">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo cliente
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o empresa..."
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
              <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                {search ? 'Sin resultados' : 'Aún no hay clientes'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                {search
                  ? `No se encontraron clientes con "${search}"`
                  : 'Registra tu primer cliente para empezar a gestionar proyectos.'}
              </p>
              {!search && (
                <Link href="/dashboard/clients/new">
                  <Button className="mt-6 lime-glow">
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar cliente
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Client list */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((client) => (
                <Link
                  key={client.id}
                  href={`/dashboard/clients/${client.id}`}
                  className="group rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 hover:border-gold/20 hover:bg-card/80 transition-all duration-200"
                >
                  {/* Avatar placeholder */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold-light font-bold text-sm">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-gold-light transition-colors truncate">
                        {client.name}
                      </h3>
                      {client.company && (
                        <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-1.5">
                    {client.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.notes && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{client.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/20">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(client.created_at).toLocaleDateString('es-MX')}
                    </span>
                    <Badge className={`text-[10px] px-2 py-0.5 border ${
                      client.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                      {client.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Portal */}
      {activeTab === 'portal' && <ClientPortalView />}
    </div>
  )
}
