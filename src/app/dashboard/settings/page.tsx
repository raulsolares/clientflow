'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Settings,
  Building2,
  Globe,
  Calendar,
  Shield,
  Database,
  ExternalLink,
  Upload,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CompanyInfo {
  name: string
  slug: string
  plan: string
  created_at: string
  logo_url: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [profile, setProfile] = useState<{ email: string; full_name: string; role: string; company_id: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
        .select('email, full_name, role, company_id')
        .eq('id', user.id)
        .single()

      if (!profileData) {
        setLoading(false)
        return
      }

      setProfile({
        email: profileData.email,
        full_name: profileData.full_name || 'Usuario',
        role: profileData.role,
        company_id: profileData.company_id,
      })

      if (profileData.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name, slug, plan, created_at, logo_url')
          .eq('id', profileData.company_id)
          .single()

        if (companyData) setCompany(companyData)
      }

      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Información general de tu cuenta y empresa
        </p>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="rounded-lg bg-gold/10 p-2.5">
            <Building2 className="h-5 w-5 text-gold-light" />
          </div>
          <div>
            <CardTitle>Empresa</CardTitle>
            <CardDescription>Detalles de tu organización</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {company ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">Nombre</span>
                <span className="text-sm font-medium text-foreground">{company.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">Slug</span>
                <span className="text-sm font-medium text-foreground font-mono">{company.slug}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="text-sm font-medium">
                  <span className="rounded-full bg-gold/10 text-gold-light px-2.5 py-0.5 text-xs font-semibold uppercase">
                    {company.plan}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Creada</span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(company.created_at).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* Logo */}
              <div className="border-t border-border/20 pt-4">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm text-muted-foreground">Logo de empresa</span>
                </div>
                <div className="flex items-center gap-4">
                  {company.logo_url ? (
                    <div className="relative h-16 w-16 rounded-lg border border-border/30 overflow-hidden bg-card/50 flex items-center justify-center">
                      <img
                        src={company.logo_url}
                        alt="Logo"
                        className="h-full w-full object-contain p-1"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border/40 bg-card/30">
                      <span className="text-xs text-muted-foreground">Sin logo</span>
                    </div>
                  )}
                  {profile?.role === 'admin' && (
                    <div className="flex flex-col gap-2">
                      <label className="relative cursor-pointer">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="sr-only"
                          disabled={uploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setUploading(true)
                            setUploadError(null)
                            try {
                              const formData = new FormData()
                              formData.append('file', file)
                              const res = await fetch('/api/company/logo', {
                                method: 'POST',
                                body: formData,
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error)
                              setCompany(prev => prev ? { ...prev, logo_url: data.logo_url } : prev)
                            } catch (err: any) {
                              setUploadError(err.message)
                            } finally {
                              setUploading(false)
                            }
                          }}
                        />
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-gold/10 text-gold-light hover:bg-gold/20 px-3 py-1.5 text-xs font-medium transition-colors">
                          <Upload className="h-3.5 w-3.5" />
                          {uploading ? 'Subiendo...' : 'Subir logo'}
                        </span>
                      </label>
                      {company.logo_url && (
                        <button
                          onClick={async () => {
                            setUploading(true)
                            try {
                              const res = await fetch('/api/company/logo', { method: 'DELETE' })
                              if (!res.ok) {
                                const data = await res.json()
                                throw new Error(data.error)
                              }
                              setCompany(prev => prev ? { ...prev, logo_url: null } : prev)
                            } catch (err: any) {
                              setUploadError(err.message)
                            } finally {
                              setUploading(false)
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 text-xs font-medium transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar logo
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {uploadError && (
                  <p className="mt-2 text-xs text-red-400">{uploadError}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin empresa asignada</p>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2.5">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <CardTitle>Cuenta</CardTitle>
            <CardDescription>Tu información de usuario</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile && (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">Nombre</span>
                <span className="text-sm font-medium text-foreground">{profile.full_name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium text-foreground">{profile.email}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Rol</span>
                <span className="text-sm font-medium">
                  <span className="rounded-full bg-gold/10 text-gold-light px-2.5 py-0.5 text-xs font-semibold capitalize">
                    {profile.role}
                  </span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="rounded-lg bg-violet-500/10 p-2.5">
            <Database className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <CardTitle>Información de la aplicación</CardTitle>
            <CardDescription>Versión y tecnologías</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <span className="text-sm text-muted-foreground">Aplicación</span>
              <span className="text-sm font-medium text-foreground">ClientFlow</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <span className="text-sm text-muted-foreground">Versión</span>
              <span className="text-sm font-medium text-foreground">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <span className="text-sm text-muted-foreground">Framework</span>
              <span className="text-sm font-medium text-foreground">Next.js 16 + React 19</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <span className="text-sm text-muted-foreground">Base de datos</span>
              <span className="text-sm font-medium text-foreground">Supabase (PostgreSQL)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/20">
              <span className="text-sm text-muted-foreground">Diseño y desarrollo</span>
              <a
                href="https://www.distritow.com"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-sm font-medium text-gold-light hover:underline"
              >
                DistritoW
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">DistritoW Lab</span>
              <span className="text-xs text-muted-foreground/60">lab.distritow.com</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
