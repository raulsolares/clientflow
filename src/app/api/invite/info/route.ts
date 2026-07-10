import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  try {
    const supabase = await createServerSupabase()

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*, companies(name)')
      .eq('token', token)
      .single()

    if (error) {
      if (error.message?.includes('relation') || error.code === '42P01') {
        return NextResponse.json({
          error: 'Migración pendiente',
          detail: 'Ejecuta la migración SQL primero',
          migration_needed: true,
        }, { status: 500 })
      }
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!invitation) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Esta invitación ya fue procesada' }, { status: 400 })
    }

    const expired = new Date(invitation.expires_at) < new Date()
    if (expired) {
      return NextResponse.json({ error: 'Esta invitación ha expirado' }, { status: 400 })
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      company_name: invitation.companies?.name || 'la empresa',
      company_id: invitation.company_id,
      status: invitation.status,
      expires_at: invitation.expires_at,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
