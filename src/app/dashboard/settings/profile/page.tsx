'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, User, Camera, Save, Loader2, Lock, Eye, EyeOff, Check, X, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<{ id: string; full_name: string; email: string; avatar_url: string | null } | null>(null)
  const [name, setName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', user.id)
        .single()

      if (p) {
        setProfile(p)
        setName(p.full_name || '')
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function saveProfile() {
    if (!profile || !name.trim()) return
    setSaving(true)
    const supabase = createClient()

    // Upload avatar if selected
    let avatarUrl = profile.avatar_url
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const filePath = `avatars/${profile.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
        avatarUrl = urlData?.publicUrl || avatarUrl
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim(), avatar_url: avatarUrl })
      .eq('id', profile.id)

    if (error) {
      alert('Error al guardar: ' + error.message)
    } else {
      setProfile({ ...profile, full_name: name.trim(), avatar_url: avatarUrl })
      setAvatarFile(null)
      setAvatarPreview(null)
    }
    setSaving(false)
  }

  async function changePassword() {
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError('La nueva contraseña debe ser diferente a la actual')
      return
    }

    setChangingPassword(true)
    const supabase = createClient()

    // First verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || '',
      password: currentPassword,
    })

    if (signInError) {
      setPasswordError('La contraseña actual es incorrecta')
      setChangingPassword(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setShowPasswordForm(false), 2000)
    }
    setChangingPassword(false)
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe ser menor a 2MB')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const initials = (profile?.full_name || profile?.email || 'U')
    .split(' ')
    .map(s => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a configuración
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Tu perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Nombre, avatar y seguridad de tu cuenta
        </p>
      </div>

      {/* Avatar + Name */}
      <Card glass>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-4 w-4 text-gold-light" />
            Información personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-gold/15 flex items-center justify-center text-2xl font-bold text-gold-light border-2 border-border/50">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-gold text-primary-foreground shadow-md hover:bg-gold-light transition-colors"
                title="Cambiar foto"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{profile?.full_name || 'Sin nombre'}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Máximo 2MB. PNG, JPG o WebP.</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nombre a mostrar</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={!name.trim() || saving} className="lime-glow">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card glass>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-4 w-4 text-gold-light" />
              Contraseña
            </CardTitle>
            <CardDescription>Cambia tu contraseña de acceso</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            {showPasswordForm ? <X className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
            {showPasswordForm ? 'Cancelar' : 'Cambiar contraseña'}
          </Button>
        </CardHeader>

        {showPasswordForm && (
          <CardContent className="space-y-4 border-t border-border/30 pt-4">
            {passwordSuccess && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Contraseña actualizada correctamente
              </div>
            )}

            {passwordError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {passwordError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contraseña actual</label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nueva contraseña</label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirmar nueva contraseña</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={changePassword} disabled={!currentPassword || !newPassword || !confirmPassword || changingPassword}>
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
                {changingPassword ? 'Cambiando...' : 'Actualizar contraseña'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
