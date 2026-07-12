'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  CreditCard,
  TrendingUp,
  Users,
  FolderKanban,
  Building2,
  ExternalLink,
  Check,
  Clock,
  ArrowRight,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface CompanyData {
  id: string
  name: string
  plan: string
  subscription_status: string | null
  created_at: string
}

interface UsageData {
  members: { current: number; limit: number }
  projects: { current: number; limit: number }
  clients: { current: number; limit: number }
}

const planLimits: Record<string, { members: number; projects: number; clients: number; price: string }> = {
  free: { members: 3, projects: 5, clients: 10, price: 'Gratis' },
  basic: { members: 10, projects: 20, clients: 50, price: '€19/mes' },
  pro: { members: 50, projects: 100, clients: 500, price: '€49/mes' },
  enterprise: { members: 999, projects: 999, clients: 999, price: 'Personalizado' },
}

const planLabels: Record<string, string> = {
  free: 'Gratis',
  basic: 'Básico',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Activa', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Check },
  inactive: { label: 'Inactiva', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: Clock },
  pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
}

export default function BillingPage() {
  const router = useRouter()
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [usage, setUsage] = useState<UsageData>({
    members: { current: 0, limit: 0 },
    projects: { current: 0, limit: 0 },
    clients: { current: 0, limit: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profileData?.company_id) {
        setLoading(false)
        return
      }

      const companyId = profileData.company_id

      // Get company data
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, plan, subscription_status, created_at')
        .eq('id', companyId)
        .single()

      if (companyData) {
        setCompany(companyData)

        const plan = companyData.plan || 'free'
        const limits = planLimits[plan] || planLimits.free

        // Get actual counts
        const { count: membersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)

        const { count: projectsCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)

        const { count: clientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)

        setUsage({
          members: { current: membersCount ?? 0, limit: limits.members },
          projects: { current: projectsCount ?? 0, limit: limits.projects },
          clients: { current: clientsCount ?? 0, limit: limits.clients },
        })
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Error opening Stripe portal:', err)
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    )
  }

  const currentPlan = company?.plan || 'free'
  const limits = planLimits[currentPlan] || planLimits.free
  const status = company?.subscription_status || (currentPlan === 'free' ? 'active' : 'inactive')
  const statusInfo = statusConfig[status] || statusConfig.inactive

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="rounded-lg bg-gold/10 p-2">
              <CreditCard className="h-5 w-5 text-gold-light" />
            </div>
            Facturación
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona tu suscripción y revisa el uso de tu plan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing">
            <Button variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-1.5" />
              Ver planes
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleManageSubscription}
            disabled={portalLoading || currentPlan === 'free'}
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            {portalLoading ? 'Abriendo...' : 'Gestionar suscripción'}
          </Button>
        </div>
      </div>

      {/* Plan & Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-gold/20 to-amber-500/10 p-2.5">
            <Zap className="h-5 w-5 text-gold-light" />
          </div>
          <div className="flex-1">
            <CardTitle>Plan actual</CardTitle>
            <CardDescription>Tu suscripción y estado de cuenta</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Plan */}
            <div className="rounded-xl border border-border/30 bg-accent/10 p-4">
              <p className="text-xs text-muted-foreground mb-1">Plan</p>
              <div className="flex items-center gap-2">
                <Badge className="bg-gold/10 text-gold-light border-gold/20 uppercase text-xs">
                  {planLabels[currentPlan] || currentPlan}
                </Badge>
              </div>
              <p className="text-lg font-bold text-foreground mt-2">{limits.price}</p>
            </div>

            {/* Status */}
            <div className="rounded-xl border border-border/30 bg-accent/10 p-4">
              <p className="text-xs text-muted-foreground mb-1">Estado</p>
              <Badge className={`${statusInfo.color} border text-xs`}>
                <statusInfo.icon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {currentPlan === 'free'
                  ? 'Plan gratuito sin límite de tiempo'
                  : `Facturación ${status === 'active' ? 'activa' : 'pendiente'}`}
              </p>
            </div>

            {/* Company */}
            <div className="rounded-xl border border-border/30 bg-accent/10 p-4">
              <p className="text-xs text-muted-foreground mb-1">Empresa</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground truncate">
                  {company?.name || 'Sin empresa'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Desde {company ? new Date(company.created_at).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Bars */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Uso del plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UsageCard
            icon={Users}
            label="Miembros"
            current={usage.members.current}
            limit={usage.members.limit}
            color="emerald"
          />
          <UsageCard
            icon={FolderKanban}
            label="Proyectos"
            current={usage.projects.current}
            limit={usage.projects.limit}
            color="blue"
          />
          <UsageCard
            icon={Building2}
            label="Clientes"
            current={usage.clients.current}
            limit={usage.clients.limit}
            color="violet"
          />
        </div>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="rounded-lg bg-violet-500/10 p-2.5">
            <CreditCard className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <CardTitle>Historial de facturación</CardTitle>
            <CardDescription>Facturas y pagos anteriores</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-accent/30 p-4 mb-3">
              <Clock className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Próximamente</p>
            <p className="text-xs text-muted-foreground mt-1">
              El historial de facturas estará disponible pronto
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {currentPlan !== 'enterprise' && (
        <div className="rounded-xl border border-gold/20 bg-gradient-to-r from-gold/5 to-amber-500/5 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-gold-light" />
                ¿Necesitas más?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Actualiza tu plan para desbloquear más miembros, proyectos y funcionalidades avanzadas.
              </p>
            </div>
            <Link href="/pricing?upgrade=true">
              <Button size="sm">
                Ver planes
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function UsageCard({
  icon: Icon,
  label,
  current,
  limit,
  color,
}: {
  icon: any
  label: string
  current: number
  limit: number
  color: string
}) {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  const colorClasses: Record<string, { bar: string; bg: string; text: string }> = {
    emerald: { bar: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    blue: { bar: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    violet: { bar: 'bg-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  }

  const colors = colorClasses[color] || colorClasses.emerald

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg ${colors.bg} p-2`}>
            <Icon className={`h-4 w-4 ${colors.text}`} />
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className={`text-xs font-semibold ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-muted-foreground'}`}>
          {current}/{limit === 999 ? '∞' : limit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-accent/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : colors.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {isAtLimit
          ? 'Límite alcanzado — considera actualizar'
          : isNearLimit
          ? 'Cerca del límite'
          : `${limit - current} restantes`}
      </p>
    </div>
  )
}
